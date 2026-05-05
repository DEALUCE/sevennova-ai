"""
SevenNova Agent Brain v2 — Base Brain
All 8 sub-brains inherit from this base class.

Enforces V2 decision loop:
  OBSERVE → CHECK → REASON → ACT → LEARN

Built-in:
- Kill switch check before every run
- Token budget check before every LLM call
- Idempotency key on every action
- Circuit breaker per tool
- Bus subscription management
- Episodic memory logging
"""
from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Optional

import structlog
from anthropic import AsyncAnthropic

from bus.message_bus import MessageBus, get_bus
from infra.models import (
    BrainID, BrainRunLog, BusMessage,
    EventType, IncidentSeverity,
    AgentAction, PrivilegeTier,
)
from infra.safety import (
    CircuitBreakerRegistry, IdempotencyStore,
    KillSwitchManager, TokenGovernor,
)

log = structlog.get_logger()


class BaseBrain(ABC):
    """
    Base class for all SevenNova sub-brains.

    Every brain must implement:
        observe() → dict      : collect raw signals
        reason(signals) → list[AgentAction]  : decide what to do
        learn(run_log)  → None : update memory/runbooks

    The CHECK and ACT steps are handled by this base class.
    """

    brain_id: BrainID
    cron_schedule: str
    description: str

    def __init__(
        self,
        kill_switches: KillSwitchManager,
        token_governor: TokenGovernor,
        circuit_breakers: CircuitBreakerRegistry,
        idempotency_store: IdempotencyStore,
        bus: Optional[MessageBus] = None,
    ):
        self.kill_switches = kill_switches
        self.token_governor = token_governor
        self.circuit_breakers = circuit_breakers
        self.idempotency_store = idempotency_store
        self.bus = bus or get_bus()
        self._client = AsyncAnthropic()
        self._run_logs: list[BrainRunLog] = []

    async def run(self) -> BrainRunLog:
        """
        Execute the full V2 decision loop.
        Returns a run log for episodic memory.
        """
        run_log = BrainRunLog(
            brain_id=self.brain_id,
            cron_schedule=self.cron_schedule,
            started_at=datetime.utcnow(),
        )

        log.info("brain_run_start", brain=self.brain_id.value)

        # ── STEP 1: CHECK ──────────────────────────────────────────────────
        # Kill switch check — before anything else
        if not self.kill_switches.is_enabled(self.brain_id):
            log.warning("brain_killed", brain=self.brain_id.value)
            run_log.error = "Kill switch disabled"
            run_log.completed_at = datetime.utcnow()
            return run_log

        # Bus pause check
        if self.bus.is_brain_paused(self.brain_id):
            log.warning("brain_paused_by_bus", brain=self.brain_id.value)
            run_log.error = "Paused by message bus"
            run_log.completed_at = datetime.utcnow()
            return run_log

        try:
            # ── STEP 2: OBSERVE ────────────────────────────────────────────
            signals = await self.observe()
            log.info("brain_observed", brain=self.brain_id.value, signals_count=len(signals))

            # ── STEP 3: REASON ─────────────────────────────────────────────
            # Token budget check before LLM call
            tokens_needed = 2000  # Conservative estimate per reason() call
            if not self.token_governor.can_use_tokens(self.brain_id, tokens_needed):
                log.warning("brain_token_budget_exceeded", brain=self.brain_id.value)
                run_log.error = "Token budget exceeded — run skipped"
                run_log.completed_at = datetime.utcnow()
                return run_log

            actions = await self.reason(signals)
            self.token_governor.record_usage(self.brain_id, tokens_needed)
            run_log.tokens_used += tokens_needed

            # ── STEP 4: ACT ────────────────────────────────────────────────
            for action in actions:
                result = await self._execute_action(action)
                if result:
                    run_log.actions_taken.append(f"{action.action_type}: {result}")

            # ── STEP 5: LEARN ──────────────────────────────────────────────
            await self.learn(run_log)

            run_log.success = True
            log.info(
                "brain_run_complete",
                brain=self.brain_id.value,
                actions=len(run_log.actions_taken),
                tokens=run_log.tokens_used,
            )

        except Exception as e:
            log.error("brain_run_error", brain=self.brain_id.value, error=str(e))
            run_log.error = str(e)

        run_log.completed_at = datetime.utcnow()
        self._run_logs.append(run_log)
        return run_log

    async def _execute_action(self, action: AgentAction) -> Optional[str]:
        """
        Execute an action with idempotency check and tier enforcement.
        """
        # Idempotency check
        if not self.idempotency_store.claim(action.idempotency_key):
            log.debug("action_idempotency_skip", key=action.idempotency_key)
            return f"SKIPPED (duplicate): {action.idempotency_key}"

        log.info(
            "action_executing",
            brain=self.brain_id.value,
            action_type=action.action_type,
            tier=action.tier.value,
        )

        try:
            if action.tier == PrivilegeTier.T1_AUTO:
                result = await self._execute_t1(action)
            elif action.tier == PrivilegeTier.T2_PROPOSE:
                result = await self._execute_t2(action)
            elif action.tier == PrivilegeTier.T3_ESCALATE:
                result = await self._execute_t3(action)
            else:
                result = f"Unknown tier: {action.tier}"

            self.idempotency_store.mark_complete(action.idempotency_key, result)
            return result

        except Exception as e:
            log.error("action_failed", action_type=action.action_type, error=str(e))
            return f"FAILED: {str(e)}"

    async def _execute_t1(self, action: AgentAction) -> str:
        """Tier 1: Execute immediately, publish result to bus."""
        result = await self.act_t1(action)
        await self.bus.publish(BusMessage(
            event_type=EventType.SYSTEM_ALERT,
            source_brain=self.brain_id,
            payload={"action": action.action_type, "result": result},
            severity=IncidentSeverity.INFO,
            idempotency_key=f"t1-complete-{action.action_id}",
        ))
        return result

    async def _execute_t2(self, action: AgentAction) -> str:
        """Tier 2: Create GitHub PR, await human approval."""
        pr_body = f"""
## SevenNova Agent Brain — Proposed Action

**Brain:** {self.brain_id.value}
**Action:** {action.action_type}
**Description:** {action.description}
**Risk Assessment:** Medium — requires human approval

### Details
{action.payload}

### Instructions
- Merge this PR to execute the action
- Close this PR to reject
- This PR will auto-expire in 48 hours if no action taken

---
*Generated by SevenNova Agent Brain v2 · © 2026 SevenNova.ai*
        """.strip()

        await self.bus.publish(BusMessage(
            event_type=EventType.PR_CREATED,
            source_brain=self.brain_id,
            payload={
                "action_type": action.action_type,
                "description": action.description,
                "pr_body": pr_body,
            },
            severity=IncidentSeverity.LOW,
            idempotency_key=f"t2-pr-{action.action_id}",
        ))
        return f"T2 PR created for: {action.action_type}"

    async def _execute_t3(self, action: AgentAction) -> str:
        """Tier 3: Escalate to Dan — no autonomous action."""
        # Check escalation rate limit
        if not self.bus._can_escalate():
            return f"T3 rate-limited — escalation queued: {action.description}"

        self.bus._escalation_record()

        await self.bus.publish(BusMessage(
            event_type=EventType.SECURITY_ALERT,
            source_brain=self.brain_id,
            payload={
                "action_type": action.action_type,
                "description": action.description,
                "requires_human": True,
                "tier": 3,
            },
            severity=IncidentSeverity.HIGH,
            idempotency_key=f"t3-escalate-{action.action_id}",
        ))
        return f"T3 escalated to Dan: {action.action_type}"

    async def call_llm(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1000,
    ) -> str:
        """
        Call Claude API with token budget enforcement.
        """
        if not self.token_governor.can_use_tokens(self.brain_id, max_tokens):
            return '{"error": "token_budget_exceeded"}'

        cb = self.circuit_breakers.get("anthropic_api")
        if cb.is_open():
            return '{"error": "circuit_breaker_open"}'

        try:
            response = await self._client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            cb.call_succeeded()
            tokens_used = response.usage.input_tokens + response.usage.output_tokens
            self.token_governor.record_usage(self.brain_id, tokens_used)
            return response.content[0].text

        except Exception as e:
            cb.call_failed()
            log.error("llm_call_failed", brain=self.brain_id.value, error=str(e))
            raise

    # ── ABSTRACT METHODS — must implement in each brain ────────────────────

    @abstractmethod
    async def observe(self) -> dict[str, Any]:
        """
        Collect raw signals from external sources.
        Called first in the decision loop.
        """
        ...

    @abstractmethod
    async def reason(self, signals: dict[str, Any]) -> list[AgentAction]:
        """
        Analyze signals and decide on actions.
        Must specify PrivilegeTier for each action.
        Must set idempotency_key on each action.
        """
        ...

    @abstractmethod
    async def act_t1(self, action: AgentAction) -> str:
        """Execute a Tier 1 (auto) action."""
        ...

    async def learn(self, run_log: BrainRunLog) -> None:
        """Update memory based on run outcome. Override to customize."""
        pass

    def get_recent_runs(self, n: int = 10) -> list[BrainRunLog]:
        """Episodic memory — recent run history."""
        return self._run_logs[-n:]
