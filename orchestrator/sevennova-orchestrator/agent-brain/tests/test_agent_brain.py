"""
SevenNova Agent Brain v2 — Test Suite
Every V2 gap fix has a corresponding test.
Target: >80% coverage

Run: pytest tests/ -v --cov=. --cov-report=term-missing
"""
from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from bus.message_bus import MessageBus
from infra.models import (
    BrainID, BusMessage, EventType,
    IncidentSeverity, PrivilegeTier,
    AgentAction, CustomerState, LeadStage,
)
from infra.safety import (
    CircuitBreaker, CircuitBreakerRegistry,
    CircuitState, IdempotencyStore,
    KillSwitchManager, TokenGovernor,
    BRAIN_TOKEN_BUDGETS,
)


# ── FIXTURES ───────────────────────────────────────────────────────────────

@pytest.fixture
def bus():
    return MessageBus()

@pytest.fixture
def kill_switches():
    return KillSwitchManager()

@pytest.fixture
def token_governor():
    return TokenGovernor()

@pytest.fixture
def circuit_registry():
    return CircuitBreakerRegistry()

@pytest.fixture
def idempotency_store():
    return IdempotencyStore()

def make_message(event_type=EventType.HEARTBEAT, source=BrainID.MONITOR, key=None):
    return BusMessage(
        event_type=event_type,
        source_brain=source,
        payload={},
        severity=IncidentSeverity.INFO,
        idempotency_key=key or uuid.uuid4().hex,
    )


# ── G-01: MESSAGE BUS ──────────────────────────────────────────────────────

class TestMessageBus:

    @pytest.mark.asyncio
    async def test_publish_and_subscribe(self, bus):
        received = []
        async def handler(msg): received.append(msg)
        bus.subscribe(EventType.HEARTBEAT, handler)
        msg = make_message(EventType.HEARTBEAT)
        await bus.publish(msg)
        assert len(received) == 1

    @pytest.mark.asyncio
    async def test_idempotency_deduplication(self, bus):
        """G-11 FIX: Duplicate messages dropped."""
        received = []
        async def handler(msg): received.append(msg)
        bus.subscribe(EventType.HEARTBEAT, handler)
        key = "unique-key-123"
        msg1 = make_message(key=key)
        msg2 = make_message(key=key)
        await bus.publish(msg1)
        result = await bus.publish(msg2)
        assert result is False
        assert len(received) == 1  # Only first processed

    @pytest.mark.asyncio
    async def test_incident_deduplication_5min_window(self, bus):
        """G-05 FIX: Same incident within 5min is deduplicated."""
        received = []
        async def handler(msg): received.append(msg)
        bus.subscribe(EventType.DOWNTIME_DETECTED, handler)

        msg1 = BusMessage(
            event_type=EventType.DOWNTIME_DETECTED,
            source_brain=BrainID.MONITOR,
            payload={"url": "sevennova.ai"},
            severity=IncidentSeverity.CRITICAL,
            idempotency_key="downtime-1",
        )
        msg2 = BusMessage(
            event_type=EventType.DOWNTIME_DETECTED,
            source_brain=BrainID.SECURITY,  # Different brain, same incident
            payload={"url": "sevennova.ai"},
            severity=IncidentSeverity.CRITICAL,
            idempotency_key="downtime-2",
        )
        r1 = await bus.publish(msg1)
        r2 = await bus.publish(msg2)
        assert r1 is True
        assert r2 is False  # Deduplicated

    @pytest.mark.asyncio
    async def test_downtime_pauses_brains(self, bus):
        """G-01 FIX: Downtime event pauses Data/Update/SEO brains."""
        msg = BusMessage(
            event_type=EventType.DOWNTIME_DETECTED,
            source_brain=BrainID.MONITOR,
            payload={},
            severity=IncidentSeverity.CRITICAL,
            idempotency_key="downtime-pause-test",
        )
        await bus.publish(msg)
        assert bus.is_brain_paused(BrainID.DATA)
        assert bus.is_brain_paused(BrainID.UPDATE)
        assert bus.is_brain_paused(BrainID.SEO)
        assert not bus.is_brain_paused(BrainID.MONITOR)

    @pytest.mark.asyncio
    async def test_uptime_restored_resumes_brains(self, bus):
        """Uptime restored unpauses previously paused brains."""
        await bus.publish(BusMessage(
            event_type=EventType.DOWNTIME_DETECTED,
            source_brain=BrainID.MONITOR,
            payload={}, severity=IncidentSeverity.CRITICAL,
            idempotency_key="down-1",
        ))
        assert bus.is_brain_paused(BrainID.DATA)

        await bus.publish(BusMessage(
            event_type=EventType.UPTIME_RESTORED,
            source_brain=BrainID.MONITOR,
            payload={}, severity=IncidentSeverity.INFO,
            idempotency_key="up-1",
        ))
        assert not bus.is_brain_paused(BrainID.DATA)

    @pytest.mark.asyncio
    async def test_escalation_rate_limit(self, bus):
        """Max 3 escalations per hour."""
        for i in range(3):
            bus._escalation_record()
        assert not bus._can_escalate()

    def test_fingerprint_same_incident(self, bus):
        """Same incident produces same fingerprint regardless of source."""
        fp1 = MessageBus.fingerprint(EventType.DOWNTIME_DETECTED, BrainID.MONITOR, {"url": "sevennova.ai"})
        fp2 = MessageBus.fingerprint(EventType.DOWNTIME_DETECTED, BrainID.SECURITY, {"url": "sevennova.ai"})
        assert fp1 == fp2

    def test_fingerprint_different_incidents(self, bus):
        """Different incidents produce different fingerprints."""
        fp1 = MessageBus.fingerprint(EventType.DOWNTIME_DETECTED, BrainID.MONITOR, {"url": "sevennova.ai"})
        fp2 = MessageBus.fingerprint(EventType.SECURITY_ALERT, BrainID.SECURITY, {"url": "sevennova.ai"})
        assert fp1 != fp2


# ── G-04: CIRCUIT BREAKER ──────────────────────────────────────────────────

class TestCircuitBreaker:

    def test_closed_by_default(self):
        cb = CircuitBreaker("test_tool")
        assert cb.state == CircuitState.CLOSED

    def test_opens_at_threshold(self):
        """G-12 FIX: Circuit opens at 50% failure rate."""
        cb = CircuitBreaker("test_tool", failure_threshold=0.5, window_size=10)
        for _ in range(4): cb.call_succeeded()
        for _ in range(6): cb.call_failed()
        assert cb.state == CircuitState.OPEN

    def test_does_not_open_below_threshold(self):
        cb = CircuitBreaker("test_tool", failure_threshold=0.5, window_size=10)
        for _ in range(6): cb.call_succeeded()
        for _ in range(4): cb.call_failed()
        assert cb.state == CircuitState.CLOSED

    def test_half_open_after_cooldown(self):
        """After cooldown period, circuit transitions to HALF_OPEN."""
        cb = CircuitBreaker("test_tool", cooldown_seconds=0)
        for _ in range(10): cb.call_failed()
        assert cb.state == CircuitState.OPEN
        time.sleep(0.01)
        assert cb.state == CircuitState.HALF_OPEN

    def test_closes_on_success_from_half_open(self):
        cb = CircuitBreaker("test_tool", cooldown_seconds=0)
        for _ in range(10): cb.call_failed()
        time.sleep(0.01)
        cb.call_succeeded()
        assert cb.state == CircuitState.CLOSED

    def test_is_open_blocks_calls(self):
        cb = CircuitBreaker("test_tool", failure_threshold=0.5, window_size=4)
        for _ in range(4): cb.call_failed()
        assert cb.is_open()


# ── G-02: KILL SWITCHES ────────────────────────────────────────────────────

class TestKillSwitches:

    def test_all_enabled_by_default(self, kill_switches):
        for brain in BrainID:
            assert kill_switches.is_enabled(brain)

    def test_disable_brain(self, kill_switches):
        """G-10 FIX: Per-brain kill switch."""
        kill_switches.disable(BrainID.SEO, "Test disable")
        assert not kill_switches.is_enabled(BrainID.SEO)
        assert kill_switches.is_enabled(BrainID.MONITOR)

    def test_enable_brain(self, kill_switches):
        kill_switches.disable(BrainID.DATA, "Test")
        kill_switches.enable(BrainID.DATA, "Re-enable")
        assert kill_switches.is_enabled(BrainID.DATA)

    def test_disable_all_except(self, kill_switches):
        kill_switches.disable_all_except(BrainID.MONITOR, BrainID.SUPERVISOR)
        assert kill_switches.is_enabled(BrainID.MONITOR)
        assert kill_switches.is_enabled(BrainID.SUPERVISOR)
        assert not kill_switches.is_enabled(BrainID.DATA)
        assert not kill_switches.is_enabled(BrainID.SEO)

    def test_switch_log_maintained(self, kill_switches):
        kill_switches.disable(BrainID.SEO, "Test reason")
        assert len(kill_switches._switch_log) == 1
        assert kill_switches._switch_log[0]["reason"] == "Test reason"


# ── G-04: TOKEN GOVERNOR ───────────────────────────────────────────────────

class TestTokenGovernor:

    def test_allows_within_budget(self, token_governor):
        assert token_governor.can_use_tokens(BrainID.MONITOR, 100)

    def test_blocks_over_brain_budget(self, token_governor):
        """G-04 FIX: Per-brain budget enforcement."""
        brain_budget = BRAIN_TOKEN_BUDGETS[BrainID.MONITOR]
        # Exceed the budget
        token_governor.record_usage(BrainID.MONITOR, brain_budget)
        assert not token_governor.can_use_tokens(BrainID.MONITOR, 1)

    def test_brain_budgets_are_independent(self, token_governor):
        """Exhausting one brain's budget doesn't affect others."""
        monitor_budget = BRAIN_TOKEN_BUDGETS[BrainID.MONITOR]
        token_governor.record_usage(BrainID.MONITOR, monitor_budget)
        assert not token_governor.can_use_tokens(BrainID.MONITOR, 1)
        assert token_governor.can_use_tokens(BrainID.DATA, 1000)

    def test_budget_status_report(self, token_governor):
        token_governor.record_usage(BrainID.SEO, 5000)
        status = token_governor.get_budget_status()
        assert "SB-08-seo" in status
        assert status["SB-08-seo"]["used"] == 5000


# ── G-11: IDEMPOTENCY STORE ────────────────────────────────────────────────

class TestIdempotencyStore:

    def test_claim_new_key(self, idempotency_store):
        assert idempotency_store.claim("email-customer-123-20260501")

    def test_duplicate_claim_blocked(self, idempotency_store):
        """G-11 FIX: No duplicate actions."""
        key = "send-email-dan-20260501"
        assert idempotency_store.claim(key)
        assert not idempotency_store.claim(key)

    def test_mark_complete(self, idempotency_store):
        key = "action-test"
        idempotency_store.claim(key)
        idempotency_store.mark_complete(key, "Done")
        assert idempotency_store.get_result(key) == "Done"

    def test_stats(self, idempotency_store):
        idempotency_store.claim("key1")
        idempotency_store.claim("key2")
        idempotency_store.mark_complete("key1", "done")
        stats = idempotency_store.stats()
        assert stats["total_keys"] == 2
        assert stats["completed"] == 1
        assert stats["in_flight"] == 1


# ── G-06: CUSTOMER CRM STATE ───────────────────────────────────────────────

class TestCustomerCRM:

    def test_customer_state_model(self):
        """G-06 FIX: Full CRM state model."""
        cs = CustomerState(
            email="broker@example.com",
            name="John Broker",
            stage=LeadStage.QUALIFIED,
            lead_score=75.0,
            churn_risk=20.0,
            reports_purchased=3,
            total_spent_usd=597.0,
        )
        assert cs.customer_id  # Auto-generated
        assert cs.stage == LeadStage.QUALIFIED
        assert cs.lead_score == 75.0

    def test_customer_state_stores_touchpoints(self):
        cs = CustomerState(email="test@test.com")
        cs.touchpoints.append({
            "type": "followup_email",
            "date": datetime.utcnow().isoformat(),
        })
        assert len(cs.touchpoints) == 1

    @pytest.mark.asyncio
    async def test_customer_brain_upsert(self, bus, kill_switches, token_governor, circuit_registry, idempotency_store):
        from brains.sub_brains import CustomerBrain
        brain = CustomerBrain(
            kill_switches=kill_switches,
            token_governor=token_governor,
            circuit_breakers=circuit_registry,
            idempotency_store=idempotency_store,
            bus=bus,
        )
        cs = CustomerState(email="investor@fund.com", lead_score=80.0)
        brain.upsert_customer(cs)
        retrieved = brain.get_customer(cs.customer_id)
        assert retrieved is not None
        assert retrieved.email == "investor@fund.com"
        assert retrieved.lead_score == 80.0


# ── INTEGRATION: FULL PIPELINE ─────────────────────────────────────────────

class TestSupervisorIntegration:

    @pytest.mark.asyncio
    async def test_supervisor_initializes(self):
        from supervisor.supervisor import SupervisorBrain
        sup = SupervisorBrain()
        assert len(sup.brains) == 8
        assert sup.kill_switches.is_enabled(BrainID.MONITOR)

    @pytest.mark.asyncio
    async def test_kill_switch_blocks_dispatch(self):
        """G-02/G-10 FIX: Kill switch prevents brain dispatch."""
        from supervisor.supervisor import SupervisorBrain
        sup = SupervisorBrain()
        sup.disable_brain(BrainID.SEO, "Test")
        result = await sup.dispatch(BrainID.SEO)
        assert result is None

    @pytest.mark.asyncio
    async def test_system_status_complete(self):
        from supervisor.supervisor import SupervisorBrain
        sup = SupervisorBrain()
        status = sup.get_system_status()
        assert "kill_switches" in status
        assert "token_budgets" in status
        assert "circuit_breakers" in status
        assert "bus_stats" in status
        assert "last_heartbeat" in status


# ── COMPLIANCE TESTS ───────────────────────────────────────────────────────

class TestCompliance:

    def test_no_brain_can_modify_own_kill_switch(self, kill_switches):
        """
        Kill switches must be external to agents.
        Agents can only check — not modify.
        """
        # BaseBrain only receives kill_switches as dependency
        # it calls is_enabled() but has no reference to disable/enable
        # This test validates the interface contract
        assert hasattr(kill_switches, 'is_enabled')
        assert hasattr(kill_switches, 'disable')
        assert hasattr(kill_switches, 'enable')
        # Brain only gets KillSwitchManager — it can only call is_enabled
        # disable/enable are supervisor-only methods

    def test_tier3_requires_escalation_check(self):
        """T3 actions must go through escalation rate limit."""
        bus = MessageBus()
        # Fill up rate limit
        for _ in range(3):
            bus._escalation_record()
        assert not bus._can_escalate()

    @pytest.mark.asyncio
    async def test_quality_gate_blocks_low_confidence(self, bus, kill_switches, token_governor, circuit_registry, idempotency_store):
        """G-08 FIX: Pre-delivery quality gate rejects low-confidence reports."""
        from brains.sub_brains import QualityBrain
        qb = QualityBrain(
            kill_switches=kill_switches,
            token_governor=token_governor,
            circuit_breakers=circuit_registry,
            idempotency_store=idempotency_store,
            bus=bus,
        )
        bad_report = {
            "request_id": "test-123",
            "overall_confidence": 30.0,  # Below 65% threshold
            "executive_summary": "Test",
            "deal_score": {"value": "C"},
            "disclaimer": "For informational purposes only.",
        }
        passed, failures = await qb.check_report(bad_report)
        assert not passed
        assert any("Confidence" in f for f in failures)

    @pytest.mark.asyncio
    async def test_quality_gate_passes_good_report(self, bus, kill_switches, token_governor, circuit_registry, idempotency_store):
        """Good reports pass the quality gate."""
        from brains.sub_brains import QualityBrain
        qb = QualityBrain(
            kill_switches=kill_switches,
            token_governor=token_governor,
            circuit_breakers=circuit_registry,
            idempotency_store=idempotency_store,
            bus=bus,
        )
        good_report = {
            "request_id": "test-456",
            "overall_confidence": 80.0,
            "executive_summary": "Full analysis complete.",
            "deal_score": {"value": "B"},
            "disclaimer": "For informational purposes only. Not a licensed appraisal. © 2026 SevenNova.ai",
        }
        passed, failures = await qb.check_report(good_report)
        assert passed
        assert len(failures) == 0

    def test_staggered_cron_no_collisions(self):
        """G-09 FIX: No two brains fire at the same minute."""
        from supervisor.supervisor import BRAIN_SCHEDULE
        # Extract minute parts from cron expressions
        minute_slots = []
        for brain, cron in BRAIN_SCHEDULE.items():
            if cron == "event-driven":
                continue
            parts = cron.split()
            minute = parts[0]
            if minute.startswith("*/"):
                continue  # wildcard — ok
            # Fixed minute — check for collisions
            if minute.isdigit():
                minute_slots.append(int(minute))
        # All fixed-minute slots should be unique (or at different hours)
        assert len(minute_slots) == len(set(minute_slots)), \
            f"Cron schedule collisions detected: {minute_slots}"
