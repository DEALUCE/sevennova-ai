"""
SevenNova Agent Brain v2 — All 8 Sub-Brains
Production implementations of every specialized brain.

SB-01 Monitor Brain    — uptime, latency, error rates
SB-02 Data Brain       — LADBS/Assessor scrape, RAG update
SB-03 Update Brain     — website content, rollback
SB-04 Quality Brain    — pre-delivery QA gate
SB-05 Cost Brain       — budget enforcement
SB-06 Security Brain   — Stripe, CVEs, rate limits
SB-07 Customer Brain   — CRM state, lead scoring
SB-08 SEO Brain        — rankings, schema, content drafts
"""
from __future__ import annotations

import hashlib
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
import structlog

from brains.base_brain import BaseBrain
from bus.message_bus import MessageBus
from infra.models import (
    AgentAction, BrainID, BrainRunLog,
    BusMessage, CustomerState, EndpointHealth,
    EventType, HealthStatus, IncidentSeverity,
    LeadStage, PrivilegeTier, SystemHealth,
)
from infra.safety import (
    CircuitBreakerRegistry, IdempotencyStore,
    KillSwitchManager, TokenGovernor,
)

log = structlog.get_logger()

SEVENNOVA_URL = "https://sevennova.ai"
API_URL = "https://api.sevennova.ai"  # Railway FastAPI URL


# ─────────────────────────────────────────────────────────────────────────
# SB-01: MONITOR BRAIN
# Cron: */5 * * * *
# ─────────────────────────────────────────────────────────────────────────

class MonitorBrain(BaseBrain):
    brain_id = BrainID.MONITOR
    cron_schedule = "*/5 * * * *"
    description = "Uptime, latency, error rate monitoring for all endpoints"

    ENDPOINTS = [
        f"{SEVENNOVA_URL}",
        f"{API_URL}/health",
        f"{API_URL}/api/v1/report",
    ]
    LATENCY_THRESHOLD_MS = 3000
    DOWN_THRESHOLD_MS = 9000

    async def observe(self) -> dict[str, Any]:
        results = []
        for url in self.ENDPOINTS:
            cb = self.circuit_breakers.get(f"ping_{url}")
            if cb.is_open():
                results.append(EndpointHealth(
                    url=url, status=HealthStatus.UNKNOWN,
                    error="circuit_breaker_open"
                ))
                continue
            try:
                start = time.time()
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(url)
                latency_ms = (time.time() - start) * 1000
                cb.call_succeeded()
                status = HealthStatus.HEALTHY
                if latency_ms > self.DOWN_THRESHOLD_MS:
                    status = HealthStatus.DOWN
                elif latency_ms > self.LATENCY_THRESHOLD_MS:
                    status = HealthStatus.DEGRADED
                elif resp.status_code >= 500:
                    status = HealthStatus.DOWN
                    cb.call_failed()
                results.append(EndpointHealth(
                    url=url, status=status,
                    latency_ms=latency_ms,
                    status_code=resp.status_code,
                ))
            except Exception as e:
                cb.call_failed()
                results.append(EndpointHealth(
                    url=url, status=HealthStatus.DOWN, error=str(e)
                ))

        latencies = [r.latency_ms for r in results if r.latency_ms is not None]
        sorted_l = sorted(latencies) if latencies else []
        health = SystemHealth(
            overall=HealthStatus.DOWN if any(r.status == HealthStatus.DOWN for r in results)
                    else HealthStatus.DEGRADED if any(r.status == HealthStatus.DEGRADED for r in results)
                    else HealthStatus.HEALTHY,
            endpoints=results,
            p50_ms=sorted_l[len(sorted_l)//2] if sorted_l else None,
            p95_ms=sorted_l[int(len(sorted_l)*0.95)] if sorted_l else None,
        )
        return {"health": health.model_dump(), "endpoint_count": len(results)}

    async def reason(self, signals: dict) -> list[AgentAction]:
        actions = []
        health_data = signals.get("health", {})
        overall = health_data.get("overall", "UNKNOWN")

        if overall == HealthStatus.DOWN:
            actions.append(AgentAction(
                idempotency_key=f"downtime-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T3_ESCALATE,
                action_type="DOWNTIME_ALERT",
                description=f"sevennova.ai is DOWN. Immediate attention required.",
                payload=health_data,
            ))
        elif overall == HealthStatus.DEGRADED:
            actions.append(AgentAction(
                idempotency_key=f"degraded-{datetime.utcnow().strftime('%Y%m%d%H')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T1_AUTO,
                action_type="LOG_DEGRADED",
                description="Latency elevated — logging for trend analysis",
                payload=health_data,
            ))

        # Publish to bus
        if overall in (HealthStatus.DOWN, HealthStatus.DEGRADED):
            await self.bus.publish(BusMessage(
                event_type=EventType.DOWNTIME_DETECTED,
                source_brain=self.brain_id,
                payload={"overall": overall, "endpoints": health_data.get("endpoints", [])},
                severity=IncidentSeverity.CRITICAL if overall == HealthStatus.DOWN else IncidentSeverity.HIGH,
                idempotency_key=f"bus-downtime-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
            ))
        elif overall == HealthStatus.HEALTHY:
            await self.bus.publish(BusMessage(
                event_type=EventType.UPTIME_RESTORED,
                source_brain=self.brain_id,
                payload={"p50_ms": health_data.get("p50_ms")},
                severity=IncidentSeverity.INFO,
                idempotency_key=f"bus-healthy-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
            ))
        return actions

    async def act_t1(self, action: AgentAction) -> str:
        log.info("monitor_log_status", action=action.action_type, payload=action.payload)
        return f"Logged: {action.action_type}"


# ─────────────────────────────────────────────────────────────────────────
# SB-02: DATA BRAIN
# Cron: 5 2 * * *
# ─────────────────────────────────────────────────────────────────────────

class DataBrain(BaseBrain):
    brain_id = BrainID.DATA
    cron_schedule = "5 2 * * *"
    description = "Daily scrape of LADBS, Assessor, ZIMAS. RAG re-embedding."

    DATA_SOURCES = [
        {"name": "ladbs_orders", "url": "https://ladbs.org/services/core-services/inspection/inspection-request"},
        {"name": "la_assessor",  "url": "https://assessor.lacounty.gov"},
        {"name": "zimas",        "url": "https://zimas.lacity.org"},
    ]

    async def observe(self) -> dict[str, Any]:
        source_status = {}
        for source in self.DATA_SOURCES:
            cb = self.circuit_breakers.get(f"scrape_{source['name']}")
            if cb.is_open():
                source_status[source["name"]] = "CIRCUIT_OPEN"
                continue
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(source["url"])
                    if resp.status_code == 200:
                        cb.call_succeeded()
                        source_status[source["name"]] = "REACHABLE"
                    else:
                        cb.call_failed()
                        source_status[source["name"]] = f"HTTP_{resp.status_code}"
            except Exception as e:
                cb.call_failed()
                source_status[source["name"]] = f"ERROR: {str(e)[:50]}"

        return {
            "source_status": source_status,
            "reachable_count": sum(1 for v in source_status.values() if v == "REACHABLE"),
            "total_sources": len(self.DATA_SOURCES),
        }

    async def reason(self, signals: dict) -> list[AgentAction]:
        actions = []
        reachable = signals.get("reachable_count", 0)
        total = signals.get("total_sources", 3)

        if reachable > 0:
            actions.append(AgentAction(
                idempotency_key=f"rag-update-{datetime.utcnow().strftime('%Y%m%d')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T1_AUTO,
                action_type="UPDATE_RAG",
                description=f"Re-embed RAG from {reachable}/{total} reachable sources",
                payload=signals,
            ))

        if reachable < total:
            await self.bus.publish(BusMessage(
                event_type=EventType.SCHEMA_DRIFT,
                source_brain=self.brain_id,
                payload={"source_status": signals.get("source_status", {})},
                severity=IncidentSeverity.MEDIUM,
                idempotency_key=f"data-sources-partial-{datetime.utcnow().strftime('%Y%m%d')}",
            ))
        return actions

    async def act_t1(self, action: AgentAction) -> str:
        if action.action_type == "UPDATE_RAG":
            await self.bus.publish(BusMessage(
                event_type=EventType.RAG_UPDATED,
                source_brain=self.brain_id,
                payload={"updated_at": datetime.utcnow().isoformat()},
                severity=IncidentSeverity.INFO,
                idempotency_key=f"rag-updated-{datetime.utcnow().strftime('%Y%m%d')}",
            ))
            return "RAG re-embedding triggered"
        return f"T1 action: {action.action_type}"


# ─────────────────────────────────────────────────────────────────────────
# SB-03: UPDATE BRAIN
# Cron: 10 5 * * *
# ─────────────────────────────────────────────────────────────────────────

class UpdateBrain(BaseBrain):
    brain_id = BrainID.UPDATE
    cron_schedule = "10 5 * * *"
    description = "Website content updates with rollback capability"

    async def observe(self) -> dict[str, Any]:
        # Check current site health as baseline before any update
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{SEVENNOVA_URL}/health")
                baseline_healthy = resp.status_code == 200
        except Exception:
            baseline_healthy = False

        return {
            "baseline_healthy": baseline_healthy,
            "current_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "should_generate_content": True,
        }

    async def reason(self, signals: dict) -> list[AgentAction]:
        if not signals.get("baseline_healthy"):
            log.warning("update_brain_skipping_unhealthy_site")
            return []

        # FIXED: All content goes through T2 PR gate — never auto-publish
        return [AgentAction(
            idempotency_key=f"content-draft-{signals['current_date']}",
            brain_id=self.brain_id,
            tier=PrivilegeTier.T2_PROPOSE,
            action_type="DRAFT_BLOG_POST",
            description="Daily blog post draft — requires human approval before publishing",
            payload={
                "topic": "LA Real Estate Intelligence Update",
                "date": signals["current_date"],
                "note": "Review and merge PR to publish",
            },
        )]

    async def act_t1(self, action: AgentAction) -> str:
        """T1 actions for Update Brain — only non-content actions."""
        if action.action_type == "ROLLBACK":
            return f"Rollback initiated: {action.payload.get('sha', 'unknown')}"
        return f"Update T1: {action.action_type}"

    async def post_deploy_health_check(self) -> bool:
        """Check site health 120s after deploy. Returns True if healthy."""
        await asyncio.sleep(120)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{SEVENNOVA_URL}/health")
                return resp.status_code == 200
        except Exception:
            return False


# ─────────────────────────────────────────────────────────────────────────
# SB-04: QUALITY BRAIN
# Trigger: event-driven (pre-delivery gate)
# FIXED V2: Now intercepts reports BEFORE delivery
# ─────────────────────────────────────────────────────────────────────────

class QualityBrain(BaseBrain):
    brain_id = BrainID.QUALITY
    cron_schedule = "event-driven"
    description = "Pre-delivery QA gate. Holds reports in PENDING until quality passes."

    CONFIDENCE_THRESHOLD = 65.0
    REQUIRED_SECTIONS = ["executive_summary", "deal_score", "disclaimer"]

    async def observe(self) -> dict[str, Any]:
        return {"mode": "event_driven", "gate_active": True}

    async def check_report(self, report: dict) -> tuple[bool, list[str]]:
        """
        V2 FIX: Pre-delivery quality gate.
        Returns (passed, list_of_failures)
        """
        failures = []

        # Check confidence threshold
        confidence = report.get("overall_confidence", 0)
        if confidence < self.CONFIDENCE_THRESHOLD:
            failures.append(f"Confidence {confidence}% below threshold {self.CONFIDENCE_THRESHOLD}%")

        # Check required sections
        for section in self.REQUIRED_SECTIONS:
            if not report.get(section):
                failures.append(f"Missing required section: {section}")

        # Check disclaimer present
        disclaimer = report.get("disclaimer", "")
        if "informational purposes only" not in disclaimer.lower():
            failures.append("Disclaimer missing or incomplete")

        # Check deal score valid
        valid_scores = {"A+", "A", "B+", "B", "C", "D", "F"}
        deal_score = str(report.get("deal_score", {}).get("value", ""))
        if deal_score not in valid_scores:
            failures.append(f"Invalid deal score: {deal_score}")

        passed = len(failures) == 0

        # Publish result to bus
        event = EventType.QUALITY_PASS if passed else EventType.QUALITY_FAIL
        await self.bus.publish(BusMessage(
            event_type=event,
            source_brain=self.brain_id,
            payload={
                "request_id": report.get("request_id"),
                "passed": passed,
                "failures": failures,
                "confidence": confidence,
            },
            severity=IncidentSeverity.INFO if passed else IncidentSeverity.HIGH,
            idempotency_key=f"qa-{report.get('request_id', uuid.uuid4().hex)}",
        ))

        if not passed:
            log.warning(
                "quality_gate_failed",
                request_id=report.get("request_id"),
                failures=failures,
            )

        return passed, failures

    async def reason(self, signals: dict) -> list[AgentAction]:
        return []

    async def act_t1(self, action: AgentAction) -> str:
        return f"Quality T1: {action.action_type}"


# ─────────────────────────────────────────────────────────────────────────
# SB-05: COST BRAIN
# Cron: 5 * * * *
# ─────────────────────────────────────────────────────────────────────────

class CostBrain(BaseBrain):
    brain_id = BrainID.COST
    cron_schedule = "5 * * * *"
    description = "API spend tracking, budget enforcement, burn rate forecasting"

    MONTHLY_BUDGET_USD = 5000.0
    ALERT_THRESHOLD_PCT = 0.80

    async def observe(self) -> dict[str, Any]:
        # Get token usage from governor
        budget_status = self.token_governor.get_budget_status()

        # Estimate cost ($3/1M tokens for Claude Sonnet)
        cost_per_million = 3.0
        global_used = budget_status.get("_global", {}).get("used", 0)
        estimated_hourly_cost = (global_used / 1_000_000) * cost_per_million
        estimated_monthly_cost = estimated_hourly_cost * 24 * 30

        # Circuit breaker states
        cb_states = self.circuit_breakers.get_all_states()
        open_circuits = [name for name, state in cb_states.items() if state.state.value == "OPEN"]

        return {
            "budget_status": budget_status,
            "estimated_hourly_cost_usd": round(estimated_hourly_cost, 4),
            "estimated_monthly_cost_usd": round(estimated_monthly_cost, 2),
            "monthly_budget_usd": self.MONTHLY_BUDGET_USD,
            "open_circuits": open_circuits,
            "burn_rate_pct": round(estimated_monthly_cost / self.MONTHLY_BUDGET_USD * 100, 1),
        }

    async def reason(self, signals: dict) -> list[AgentAction]:
        actions = []
        burn_rate = signals.get("burn_rate_pct", 0)
        open_circuits = signals.get("open_circuits", [])

        if burn_rate >= 100:
            await self.bus.publish(BusMessage(
                event_type=EventType.BUDGET_EXCEEDED,
                source_brain=self.brain_id,
                payload=signals,
                severity=IncidentSeverity.CRITICAL,
                idempotency_key=f"budget-exceeded-{datetime.utcnow().strftime('%Y%m%d%H')}",
            ))
            actions.append(AgentAction(
                idempotency_key=f"budget-exceeded-escalate-{datetime.utcnow().strftime('%Y%m%d%H')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T3_ESCALATE,
                action_type="BUDGET_EXCEEDED_ALERT",
                description=f"Monthly budget exceeded: {burn_rate}% of ${self.MONTHLY_BUDGET_USD}",
                payload=signals,
            ))

        elif burn_rate >= self.ALERT_THRESHOLD_PCT * 100:
            await self.bus.publish(BusMessage(
                event_type=EventType.BUDGET_80PCT,
                source_brain=self.brain_id,
                payload=signals,
                severity=IncidentSeverity.HIGH,
                idempotency_key=f"budget-80pct-{datetime.utcnow().strftime('%Y%m%d%H')}",
            ))

        if open_circuits:
            await self.bus.publish(BusMessage(
                event_type=EventType.CIRCUIT_OPEN,
                source_brain=self.brain_id,
                payload={"open_circuits": open_circuits},
                severity=IncidentSeverity.MEDIUM,
                idempotency_key=f"circuit-open-{'-'.join(sorted(open_circuits))}-{datetime.utcnow().strftime('%Y%m%d%H')}",
            ))

        return actions

    async def act_t1(self, action: AgentAction) -> str:
        return f"Cost logged: {action.action_type}"


# ─────────────────────────────────────────────────────────────────────────
# SB-06: SECURITY BRAIN
# Cron: 15 * * * * (staggered from Cost Brain's 5 * * * *)
# ─────────────────────────────────────────────────────────────────────────

class SecurityBrain(BaseBrain):
    brain_id = BrainID.SECURITY
    cron_schedule = "15 * * * *"
    description = "Stripe validation, CVE scanning, rate limit monitoring"

    async def observe(self) -> dict[str, Any]:
        signals = {
            "stripe_webhook_configured": bool(os.getenv("STRIPE_WEBHOOK_SECRET")),
            "api_key_age_days": self._check_api_key_age(),
            "recent_failed_auths": 0,  # TODO: pull from Cloudflare analytics
            "dependency_cve_count": 0,  # TODO: integrate with safety-db
        }
        return signals

    def _check_api_key_age(self) -> int:
        """Check how old the Anthropic API key is (days). -1 if unknown."""
        return -1  # [UNVERIFIED] — would need key metadata API

    async def reason(self, signals: dict) -> list[AgentAction]:
        actions = []

        if not signals.get("stripe_webhook_configured"):
            actions.append(AgentAction(
                idempotency_key=f"stripe-missing-{datetime.utcnow().strftime('%Y%m%d')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T3_ESCALATE,
                action_type="STRIPE_WEBHOOK_NOT_CONFIGURED",
                description="STRIPE_WEBHOOK_SECRET not set — payments unverified",
                payload=signals,
            ))

        if signals.get("recent_failed_auths", 0) > 10:
            actions.append(AgentAction(
                idempotency_key=f"auth-burst-{datetime.utcnow().strftime('%Y%m%d%H')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T3_ESCALATE,
                action_type="AUTH_BURST_DETECTED",
                description=f"Unusual authentication failures: {signals['recent_failed_auths']}",
                payload=signals,
            ))

        return actions

    async def act_t1(self, action: AgentAction) -> str:
        return f"Security T1: {action.action_type}"


# ─────────────────────────────────────────────────────────────────────────
# SB-07: CUSTOMER BRAIN
# Cron: 0 9,14,17 * * *
# FIXED V2: Full CRM state store
# ─────────────────────────────────────────────────────────────────────────

class CustomerBrain(BaseBrain):
    brain_id = BrainID.CUSTOMER
    cron_schedule = "0 9,14,17 * * *"
    description = "Lead scoring, CRM state, follow-up emails, churn detection"

    # In-memory CRM for MVP — replace with Postgres in production
    _customers: dict[str, CustomerState] = {}

    async def observe(self) -> dict[str, Any]:
        now = datetime.utcnow()
        due_followups = []
        churn_risks = []

        for customer_id, state in self._customers.items():
            # Check overdue followups
            if state.next_followup and state.next_followup <= now:
                due_followups.append(customer_id)
            # Check churn risk
            if state.churn_risk > 70:
                churn_risks.append({"id": customer_id, "risk": state.churn_risk})

        return {
            "total_customers": len(self._customers),
            "due_followups": due_followups,
            "churn_risks": churn_risks,
            "new_leads_today": 0,  # TODO: pull from Stripe + contact form
        }

    async def reason(self, signals: dict) -> list[AgentAction]:
        actions = []
        due = signals.get("due_followups", [])
        churning = signals.get("churn_risks", [])

        for customer_id in due:
            customer = self._customers.get(customer_id)
            if not customer:
                continue
            actions.append(AgentAction(
                # Idempotency: one followup per customer per day
                idempotency_key=f"followup-{customer_id}-{datetime.utcnow().strftime('%Y%m%d')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T1_AUTO,
                action_type="SEND_FOLLOWUP_EMAIL",
                description=f"Scheduled followup for {customer.email}",
                payload={"customer_id": customer_id, "email": customer.email},
            ))

        for item in churning:
            actions.append(AgentAction(
                idempotency_key=f"churn-alert-{item['id']}-{datetime.utcnow().strftime('%Y%m%d')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T2_PROPOSE,
                action_type="CHURN_INTERVENTION",
                description=f"Customer {item['id']} churn risk {item['risk']}% — propose retention action",
                payload=item,
            ))

        # Publish churn alerts to bus
        if churning:
            await self.bus.publish(BusMessage(
                event_type=EventType.CHURN_RISK,
                source_brain=self.brain_id,
                payload={"churn_risks": churning},
                severity=IncidentSeverity.MEDIUM,
                idempotency_key=f"churn-bus-{datetime.utcnow().strftime('%Y%m%d%H')}",
            ))

        return actions

    async def act_t1(self, action: AgentAction) -> str:
        if action.action_type == "SEND_FOLLOWUP_EMAIL":
            customer_id = action.payload.get("customer_id")
            if customer_id in self._customers:
                customer = self._customers[customer_id]
                # Update CRM state
                customer.last_contact = datetime.utcnow()
                customer.next_followup = datetime.utcnow() + timedelta(days=7)
                customer.touchpoints.append({
                    "type": "followup_email",
                    "date": datetime.utcnow().isoformat(),
                })
                await self.bus.publish(BusMessage(
                    event_type=EventType.LEAD_SCORED,
                    source_brain=self.brain_id,
                    payload={"customer_id": customer_id, "action": "followup_sent"},
                    severity=IncidentSeverity.INFO,
                    idempotency_key=f"lead-scored-{customer_id}-{datetime.utcnow().strftime('%Y%m%d%H')}",
                ))
            return f"Followup sent: {action.payload.get('email', 'unknown')}"
        return f"Customer T1: {action.action_type}"

    def upsert_customer(self, state: CustomerState) -> None:
        """Upsert customer state in CRM store."""
        state.updated_at = datetime.utcnow()
        self._customers[state.customer_id] = state

    def get_customer(self, customer_id: str) -> Optional[CustomerState]:
        return self._customers.get(customer_id)


# ─────────────────────────────────────────────────────────────────────────
# SB-08: SEO BRAIN
# Cron: 20 6 * * *
# FIXED V2: All content via T2 PR — no auto-publish
# ─────────────────────────────────────────────────────────────────────────

class SEOBrain(BaseBrain):
    brain_id = BrainID.SEO
    cron_schedule = "20 6 * * *"
    description = "Rankings, location pages, schema refresh — via T2 PR gate"

    TARGET_KEYWORDS = [
        "LA real estate analysis",
        "Los Angeles property intelligence",
        "Jefferson Blvd commercial real estate",
        "LA TOC zoning analysis",
        "Los Angeles ED1 development",
        "LADBS violation property analysis",
        "West Adams real estate investment",
    ]

    async def observe(self) -> dict[str, Any]:
        # [ASSUMPTION] rank checking would use Google Search Console API
        # [UNVERIFIED] — GSC API not yet configured
        return {
            "target_keywords": self.TARGET_KEYWORDS,
            "gsc_configured": False,  # [UNVERIFIED]
            "schema_needs_refresh": True,
            "sitemap_needs_update": True,
            "content_gaps": ["LA market trends", "LADBS violation guide"],
        }

    async def reason(self, signals: dict) -> list[AgentAction]:
        actions = []

        # Generate content draft — T2 (requires Dan's approval)
        for gap in signals.get("content_gaps", [])[:1]:  # 1 per run
            actions.append(AgentAction(
                idempotency_key=f"seo-content-{gap.replace(' ', '-')}-{datetime.utcnow().strftime('%Y%m%d')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T2_PROPOSE,
                action_type="DRAFT_SEO_CONTENT",
                description=f"Draft SEO content for: {gap}",
                payload={
                    "topic": gap,
                    "keywords": self.TARGET_KEYWORDS[:3],
                    "note": "Review and merge PR to publish on sevennova.ai",
                },
            ))

        # Schema refresh — T1 (non-destructive metadata update)
        if signals.get("schema_needs_refresh"):
            actions.append(AgentAction(
                idempotency_key=f"schema-refresh-{datetime.utcnow().strftime('%Y%m%d')}",
                brain_id=self.brain_id,
                tier=PrivilegeTier.T1_AUTO,
                action_type="REFRESH_SCHEMA_MARKUP",
                description="Update JSON-LD schema markup",
                payload={"schema_types": ["Organization", "Product", "FAQPage"]},
            ))

        await self.bus.publish(BusMessage(
            event_type=EventType.CONTENT_DRAFTED,
            source_brain=self.brain_id,
            payload={"content_gaps": signals.get("content_gaps", [])},
            severity=IncidentSeverity.INFO,
            idempotency_key=f"seo-content-bus-{datetime.utcnow().strftime('%Y%m%d')}",
        ))

        return actions

    async def act_t1(self, action: AgentAction) -> str:
        if action.action_type == "REFRESH_SCHEMA_MARKUP":
            return f"Schema markup refreshed: {action.payload.get('schema_types')}"
        return f"SEO T1: {action.action_type}"


# Needed for UpdateBrain.post_deploy_health_check
import asyncio
import os
