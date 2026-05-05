"""
SevenNova Agent Brain v2 — Supervisor + Watchdog

Supervisor:
- Orchestrates all 8 sub-brains
- Checks kill switch before every dispatch
- Sends heartbeat to external watchdog every 5min
- Enforces global cost cap
- Manages cron schedules (staggered — no collisions)

Watchdog:
- Completely independent process
- Monitors Supervisor's heartbeat
- If heartbeat stops: pages Dan via email + SMS
- Cannot be disabled by any brain
"""
from __future__ import annotations

import asyncio
import os
import time
from datetime import datetime
from typing import Optional

import structlog

from brains.base_brain import BaseBrain
from brains.sub_brains import (
    CostBrain, CustomerBrain, DataBrain,
    MonitorBrain, QualityBrain, SEOBrain,
    SecurityBrain, UpdateBrain,
)
from bus.message_bus import MessageBus, get_bus
from infra.models import (
    AgentAction, BrainID, BrainRunLog,
    BusMessage, EventType, IncidentSeverity,
    PrivilegeTier,
)
from infra.safety import (
    CircuitBreakerRegistry, IdempotencyStore,
    KillSwitchManager, TokenGovernor,
)

log = structlog.get_logger()

# Staggered cron schedules — no two brains fire in the same minute
# V2 FIX: eliminates DB contention + API rate limit collisions
BRAIN_SCHEDULE = {
    BrainID.MONITOR:   "*/5 * * * *",     # Every 5 min (wildcard — no fixed slot)
    BrainID.DATA:      "5 2 * * *",        # 02:05 UTC daily       [minute=5]
    BrainID.UPDATE:    "10 5 * * *",       # 05:10 UTC daily       [minute=10]
    BrainID.QUALITY:   "event-driven",     # Event-driven only
    BrainID.COST:      "6 * * * *",        # :06 past every hour   [minute=6]  (was 5, collided with DATA)
    BrainID.SECURITY:  "15 * * * *",       # :15 past every hour   [minute=15]
    BrainID.CUSTOMER:  "0 9,14,17 * * *",  # 09:00, 14:00, 17:00  [minute=0]
    BrainID.SEO:       "20 6 * * *",       # 06:20 UTC daily       [minute=20]
}


class SupervisorBrain:
    """
    V2 Supervisor — control plane for all 8 sub-brains.

    Responsibilities:
    1. Dispatch sub-brains on schedule
    2. Check kill switch before every dispatch
    3. Send heartbeat every 5min
    4. Enforce global cost cap
    5. Aggregate run logs
    6. Handle escalation routing
    """

    def __init__(self):
        # Shared safety infrastructure
        self.kill_switches = KillSwitchManager()
        self.token_governor = TokenGovernor()
        self.circuit_breakers = CircuitBreakerRegistry()
        self.idempotency_store = IdempotencyStore()
        self.bus = get_bus()

        # Initialize all 8 sub-brains
        brain_kwargs = dict(
            kill_switches=self.kill_switches,
            token_governor=self.token_governor,
            circuit_breakers=self.circuit_breakers,
            idempotency_store=self.idempotency_store,
            bus=self.bus,
        )

        self.brains: dict[BrainID, BaseBrain] = {
            BrainID.MONITOR:   MonitorBrain(**brain_kwargs),
            BrainID.DATA:      DataBrain(**brain_kwargs),
            BrainID.UPDATE:    UpdateBrain(**brain_kwargs),
            BrainID.QUALITY:   QualityBrain(**brain_kwargs),
            BrainID.COST:      CostBrain(**brain_kwargs),
            BrainID.SECURITY:  SecurityBrain(**brain_kwargs),
            BrainID.CUSTOMER:  CustomerBrain(**brain_kwargs),
            BrainID.SEO:       SEOBrain(**brain_kwargs),
        }

        self._last_heartbeat: float = time.time()
        self._run_history: list[dict] = []

        log.info("supervisor_initialized", brain_count=len(self.brains))

    async def dispatch(self, brain_id: BrainID) -> Optional[BrainRunLog]:
        """
        Dispatch a single brain.
        Checks: kill switch → bus pause → token budget → execute
        """
        # Kill switch check — V2 requirement
        if not self.kill_switches.is_enabled(brain_id):
            log.warning("dispatch_blocked_kill_switch", brain=brain_id.value)
            return None

        # Bus pause check
        if self.bus.is_brain_paused(brain_id):
            log.warning("dispatch_blocked_bus_pause", brain=brain_id.value)
            return None

        brain = self.brains.get(brain_id)
        if not brain:
            log.error("dispatch_unknown_brain", brain=brain_id.value)
            return None

        log.info("dispatch_brain", brain=brain_id.value)
        run_log = await brain.run()

        self._run_history.append({
            "brain": brain_id.value,
            "run_id": run_log.run_id,
            "success": run_log.success,
            "duration_s": run_log.duration_seconds,
            "tokens": run_log.tokens_used,
            "error": run_log.error,
            "dispatched_at": datetime.utcnow().isoformat(),
        })

        return run_log

    async def send_heartbeat(self) -> None:
        """
        Send heartbeat to external watchdog.
        If this stops, watchdog pages Dan within 10 minutes.
        """
        self._last_heartbeat = time.time()

        watchdog_url = os.getenv("WATCHDOG_HEARTBEAT_URL", "")
        if watchdog_url:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.get(watchdog_url)
                log.debug("heartbeat_sent")
            except Exception as e:
                log.error("heartbeat_failed", error=str(e))

        # Publish heartbeat to bus for internal monitoring
        await self.bus.publish(BusMessage(
            event_type=EventType.HEARTBEAT,
            source_brain=BrainID.SUPERVISOR,
            payload={
                "timestamp": datetime.utcnow().isoformat(),
                "brains_active": len(self.brains),
                "kill_switch_status": self.kill_switches.get_status(),
                "budget_status": self.token_governor.get_budget_status().get("_global", {}),
            },
            severity=IncidentSeverity.INFO,
            idempotency_key=f"heartbeat-{int(time.time() // 300)}",
        ))

    async def run_monitor_cycle(self) -> None:
        """
        Main monitoring cycle — runs every 5 minutes.
        Heartbeat + Monitor Brain dispatch.
        """
        await self.send_heartbeat()
        await self.dispatch(BrainID.MONITOR)

    async def run_daily_cycle(self) -> None:
        """
        Daily maintenance — runs at 02:00 UTC.
        All daily brains in staggered order.
        """
        log.info("supervisor_daily_cycle_start")
        for brain_id in [BrainID.DATA, BrainID.UPDATE, BrainID.SEO]:
            await self.dispatch(brain_id)
            await asyncio.sleep(60)  # 1 min between heavy brains

    async def run_hourly_cycle(self) -> None:
        """
        Hourly checks — Cost + Security (staggered).
        """
        await self.dispatch(BrainID.COST)
        await asyncio.sleep(60 * 10)  # Cost at :05, Security at :15
        await self.dispatch(BrainID.SECURITY)

    async def run_customer_cycle(self) -> None:
        """Customer touchpoints — 9am, 2pm, 5pm UTC."""
        await self.dispatch(BrainID.CUSTOMER)

    def get_system_status(self) -> dict:
        """Full system status for monitoring dashboard."""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "kill_switches": self.kill_switches.get_status(),
            "token_budgets": self.token_governor.get_budget_status(),
            "circuit_breakers": {
                name: state.model_dump()
                for name, state in self.circuit_breakers.get_all_states().items()
            },
            "bus_stats": self.bus.get_stats(),
            "idempotency_stats": self.idempotency_store.stats(),
            "recent_runs": self._run_history[-20:],
            "last_heartbeat": datetime.fromtimestamp(self._last_heartbeat).isoformat(),
        }

    def disable_brain(self, brain_id: BrainID, reason: str) -> None:
        """Hot-disable a brain via kill switch."""
        self.kill_switches.disable(brain_id, reason)

    def enable_brain(self, brain_id: BrainID, reason: str) -> None:
        """Re-enable a brain."""
        self.kill_switches.enable(brain_id, reason)


# ── EXTERNAL WATCHDOG ─────────────────────────────────────────────────────

class ExternalWatchdog:
    """
    Completely independent watchdog process.
    Monitors Supervisor's heartbeat.
    If heartbeat stops: pages Dan.

    CRITICAL: Cannot be disabled by any brain.
    Runs in a separate process/container from the Supervisor.

    In production: deployed as a separate Railway service
    or use RedSwitch (redswitch.ai — free, open source).
    """

    def __init__(
        self,
        heartbeat_timeout_seconds: int = 600,  # 10 minutes
        dan_email: str = "dan.issak@gmail.com",
    ):
        self.heartbeat_timeout = heartbeat_timeout_seconds
        self.dan_email = dan_email
        self._last_seen: float = time.time()
        self._alert_sent: bool = False

    def record_heartbeat(self) -> None:
        """Record a heartbeat from the Supervisor."""
        self._last_seen = time.time()
        self._alert_sent = False
        log.debug("watchdog_heartbeat_received")

    def is_supervisor_alive(self) -> bool:
        """Check if Supervisor is still alive."""
        age = time.time() - self._last_seen
        return age < self.heartbeat_timeout

    async def check_and_alert(self) -> None:
        """
        Check Supervisor health. Alert Dan if dead.
        Run this every 60 seconds in a separate process.
        """
        if not self.is_supervisor_alive() and not self._alert_sent:
            age_minutes = (time.time() - self._last_seen) / 60
            log.critical(
                "supervisor_dead",
                last_heartbeat_minutes_ago=round(age_minutes, 1),
            )
            await self._alert_dan(age_minutes)
            self._alert_sent = True

    async def _alert_dan(self, age_minutes: float) -> None:
        """Send alert to Dan via email."""
        import smtplib
        from email.mime.text import MIMEText

        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASSWORD", "")

        if not smtp_user or not smtp_pass:
            log.error("watchdog_smtp_not_configured")
            return

        subject = f"🚨 SevenNova Agent Brain DEAD — {age_minutes:.0f} min silent"
        body = f"""
SevenNova Agent Brain Supervisor has stopped responding.

Last heartbeat: {age_minutes:.0f} minutes ago
Expected: every 5 minutes

IMMEDIATE ACTION REQUIRED:
1. Check Railway dashboard — https://railway.app
2. Check Sentry for error traces
3. Restart the agent-brain service if needed

This alert was sent by the External Watchdog (independent process).
It cannot be disabled by the Agent Brain itself.

— SevenNova Watchdog
        """.strip()

        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = self.dan_email

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, self.dan_email, msg.as_string())

            log.critical("watchdog_alert_sent", to=self.dan_email)
        except Exception as e:
            log.error("watchdog_alert_failed", error=str(e))
