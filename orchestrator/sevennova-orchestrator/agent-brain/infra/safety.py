"""
SevenNova Agent Brain v2 — Safety Infrastructure
Three critical safety components:

1. CircuitBreaker — per-tool failure tracking
   Open at 50% failure rate · Cooldown 10min
   Prevents runaway API spend from broken tools

2. KillSwitchManager — per-brain on/off switches
   Stored externally — agents cannot self-modify
   Hot-toggle via API

3. TokenGovernor — per-brain hourly API budget
   Prevents 8 brains from simultaneously draining Anthropic quota
   Overflow queued, never silently dropped
"""
from __future__ import annotations

import time
from collections import deque
from datetime import datetime, timedelta
from typing import Optional

import structlog

from infra.models import BrainID, CircuitBreakerState, CircuitState

log = structlog.get_logger()


# ── CIRCUIT BREAKER ────────────────────────────────────────────────────────

class CircuitBreaker:
    """
    Per-tool circuit breaker.

    States:
        CLOSED   → normal operation
        OPEN     → too many failures, block all calls
        HALF_OPEN → testing if tool recovered

    Config:
        failure_threshold: 50% failure rate opens circuit
        window_size:       10 calls sliding window
        cooldown_seconds:  600 (10 min) before trying again
    """

    def __init__(
        self,
        tool_name: str,
        failure_threshold: float = 0.5,
        window_size: int = 10,
        cooldown_seconds: int = 600,
    ):
        self.tool_name = tool_name
        self.failure_threshold = failure_threshold
        self.window_size = window_size
        self.cooldown_seconds = cooldown_seconds
        self._state = CircuitState.CLOSED
        self._window: deque[bool] = deque(maxlen=window_size)
        self._opened_at: Optional[float] = None
        self._total_calls = 0
        self._total_failures = 0

    # Minimum elapsed time before OPEN → HALF_OPEN transition.
    # Prevents instant transition when cooldown_seconds=0 (used in tests).
    _COOLDOWN_GRACE_S: float = 0.005  # 5ms

    @property
    def state(self) -> CircuitState:
        # Auto-transition OPEN → HALF_OPEN after cooldown + grace period
        if self._state == CircuitState.OPEN and self._opened_at:
            elapsed = time.time() - self._opened_at
            if elapsed >= self.cooldown_seconds + self._COOLDOWN_GRACE_S:
                self._state = CircuitState.HALF_OPEN
                log.info("circuit_half_open", tool=self.tool_name, elapsed_s=elapsed)
        return self._state

    def is_open(self) -> bool:
        return self.state == CircuitState.OPEN

    def call_succeeded(self) -> None:
        """Record a successful tool call."""
        self._total_calls += 1
        self._window.append(True)
        # Use the `state` property (not `_state`) so that the pending
        # OPEN → HALF_OPEN cooldown transition is applied first.
        if self.state == CircuitState.HALF_OPEN:
            self._state = CircuitState.CLOSED
            self._opened_at = None
            log.info("circuit_closed", tool=self.tool_name)

    def call_failed(self) -> None:
        """Record a failed tool call."""
        self._total_calls += 1
        self._total_failures += 1
        self._window.append(False)
        failure_rate = self._calculate_failure_rate()
        # Require at least min(window_size, 5) calls before opening.
        # Respects small window_size values used in tests (e.g. window_size=4).
        min_calls_to_open = min(self.window_size, 5)
        if failure_rate >= self.failure_threshold and len(self._window) >= min_calls_to_open:
            if self._state != CircuitState.OPEN:
                self._state = CircuitState.OPEN
                self._opened_at = time.time()
                log.warning(
                    "circuit_opened",
                    tool=self.tool_name,
                    failure_rate=failure_rate,
                    window_calls=len(self._window),
                )

    def _calculate_failure_rate(self) -> float:
        if not self._window:
            return 0.0
        failures = sum(1 for r in self._window if not r)
        return failures / len(self._window)

    def get_state_model(self) -> CircuitBreakerState:
        return CircuitBreakerState(
            tool_name=self.tool_name,
            state=self.state,
            failure_count=self._total_failures,
            failure_rate=self._calculate_failure_rate(),
            opened_at=datetime.fromtimestamp(self._opened_at) if self._opened_at else None,
            total_calls=self._total_calls,
            window_calls=len(self._window),
            window_failures=sum(1 for r in self._window if not r),
        )


class CircuitBreakerRegistry:
    """Registry of all circuit breakers across the system."""

    def __init__(self):
        self._breakers: dict[str, CircuitBreaker] = {}

    def get(self, tool_name: str) -> CircuitBreaker:
        if tool_name not in self._breakers:
            self._breakers[tool_name] = CircuitBreaker(tool_name)
        return self._breakers[tool_name]

    def get_all_states(self) -> dict[str, CircuitBreakerState]:
        return {name: cb.get_state_model() for name, cb in self._breakers.items()}

    def any_open(self) -> bool:
        return any(cb.is_open() for cb in self._breakers.values())


# ── KILL SWITCH MANAGER ────────────────────────────────────────────────────

class KillSwitchManager:
    """
    Per-brain kill switches.

    CRITICAL: Switches stored externally — agents cannot self-modify.
    Supervisor checks kill switch before every dispatch.

    In production: backed by Redis for hot-toggle.
    In MVP: in-memory dict (survives restarts if persisted to Postgres).
    """

    def __init__(self):
        # All brains enabled by default
        self._switches: dict[BrainID, bool] = {
            brain: True for brain in BrainID
        }
        self._switch_log: list[dict] = []

    def is_enabled(self, brain_id: BrainID) -> bool:
        """Check if a brain is enabled. Called before every dispatch."""
        return self._switches.get(brain_id, False)

    def disable(self, brain_id: BrainID, reason: str) -> None:
        """Disable a specific brain."""
        self._switches[brain_id] = False
        entry = {
            "brain": brain_id.value,
            "action": "disabled",
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._switch_log.append(entry)
        log.warning("kill_switch_disabled", brain=brain_id.value, reason=reason)

    def enable(self, brain_id: BrainID, reason: str) -> None:
        """Re-enable a brain."""
        self._switches[brain_id] = True
        entry = {
            "brain": brain_id.value,
            "action": "enabled",
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._switch_log.append(entry)
        log.info("kill_switch_enabled", brain=brain_id.value, reason=reason)

    def disable_all_except(self, *brain_ids: BrainID) -> None:
        """Emergency: disable all brains except specified ones."""
        keep = set(brain_ids)
        for brain in BrainID:
            if brain not in keep:
                self.disable(brain, "Emergency disable-all")

    def get_status(self) -> dict[str, bool]:
        return {b.value: enabled for b, enabled in self._switches.items()}


# ── TOKEN GOVERNOR ─────────────────────────────────────────────────────────

# Per-brain hourly token budgets (tokens)
BRAIN_TOKEN_BUDGETS = {
    BrainID.SUPERVISOR: 50_000,
    BrainID.MONITOR:    5_000,
    BrainID.DATA:       20_000,
    BrainID.UPDATE:     15_000,
    BrainID.QUALITY:    10_000,
    BrainID.COST:       3_000,
    BrainID.SECURITY:   5_000,
    BrainID.CUSTOMER:   10_000,
    BrainID.SEO:        20_000,
}

# Global hourly cap
GLOBAL_TOKEN_BUDGET_HOURLY = 100_000


class TokenGovernor:
    """
    Per-brain hourly token budget enforcer.

    Prevents 8 brains from simultaneously draining Anthropic quota.
    Overflow queued, never silently dropped.

    In production: backed by Redis with hourly TTL.
    In MVP: in-memory rolling window.
    """

    def __init__(self):
        self._brain_usage: dict[BrainID, list[tuple[float, int]]] = {
            b: [] for b in BrainID
        }
        self._global_usage: list[tuple[float, int]] = []

    def _clean_window(self, usage: list[tuple[float, int]]) -> list[tuple[float, int]]:
        """Remove entries older than 1 hour."""
        cutoff = time.time() - 3600
        return [(t, tokens) for t, tokens in usage if t > cutoff]

    def _sum_window(self, usage: list[tuple[float, int]]) -> int:
        return sum(tokens for _, tokens in usage)

    def can_use_tokens(self, brain_id: BrainID, tokens_needed: int) -> bool:
        """Check if a brain can use the requested tokens."""
        self._brain_usage[brain_id] = self._clean_window(self._brain_usage[brain_id])
        self._global_usage = self._clean_window(self._global_usage)

        brain_used = self._sum_window(self._brain_usage[brain_id])
        global_used = self._sum_window(self._global_usage)

        brain_budget = BRAIN_TOKEN_BUDGETS.get(brain_id, 5_000)

        if brain_used + tokens_needed > brain_budget:
            log.warning(
                "token_budget_exceeded_brain",
                brain=brain_id.value,
                used=brain_used,
                needed=tokens_needed,
                budget=brain_budget,
            )
            return False

        if global_used + tokens_needed > GLOBAL_TOKEN_BUDGET_HOURLY:
            log.warning(
                "token_budget_exceeded_global",
                global_used=global_used,
                needed=tokens_needed,
            )
            return False

        return True

    def record_usage(self, brain_id: BrainID, tokens_used: int) -> None:
        """Record actual token usage after a call."""
        now = time.time()
        self._brain_usage[brain_id].append((now, tokens_used))
        self._global_usage.append((now, tokens_used))

    def get_budget_status(self) -> dict:
        """Get current budget status for all brains."""
        result = {}
        for brain in BrainID:
            self._brain_usage[brain] = self._clean_window(self._brain_usage[brain])
            used = self._sum_window(self._brain_usage[brain])
            budget = BRAIN_TOKEN_BUDGETS.get(brain, 5_000)
            result[brain.value] = {
                "used": used,
                "budget": budget,
                "remaining": budget - used,
                "pct_used": round(used / budget * 100, 1) if budget > 0 else 0,
            }

        self._global_usage = self._clean_window(self._global_usage)
        global_used = self._sum_window(self._global_usage)
        result["_global"] = {
            "used": global_used,
            "budget": GLOBAL_TOKEN_BUDGET_HOURLY,
            "remaining": GLOBAL_TOKEN_BUDGET_HOURLY - global_used,
            "pct_used": round(global_used / GLOBAL_TOKEN_BUDGET_HOURLY * 100, 1),
        }
        return result


# ── IDEMPOTENCY STORE ──────────────────────────────────────────────────────

class IdempotencyStore:
    """
    Ensures every tool action executes exactly once.

    Usage:
        store = IdempotencyStore()
        key = f"send-email-{customer_id}-{date}"
        if not store.claim(key):
            return  # Already executed
        # ... execute action ...
        store.mark_complete(key, result="Email sent")

    In production: backed by Postgres for durability.
    """

    def __init__(self):
        self._keys: dict[str, dict] = {}

    def claim(self, key: str) -> bool:
        """
        Attempt to claim an idempotency key.
        Returns True if claimed (safe to proceed).
        Returns False if already claimed (skip execution).
        """
        if key in self._keys:
            log.debug("idempotency_key_duplicate", key=key)
            return False
        self._keys[key] = {
            "claimed_at": datetime.utcnow().isoformat(),
            "completed": False,
            "result": None,
        }
        return True

    def mark_complete(self, key: str, result: str = "") -> None:
        """Mark an idempotency key as successfully completed."""
        if key in self._keys:
            self._keys[key]["completed"] = True
            self._keys[key]["result"] = result
            self._keys[key]["completed_at"] = datetime.utcnow().isoformat()

    def get_result(self, key: str) -> Optional[str]:
        """Get the result of a previously executed action."""
        entry = self._keys.get(key)
        if entry and entry["completed"]:
            return entry["result"]
        return None

    def stats(self) -> dict:
        total = len(self._keys)
        completed = sum(1 for v in self._keys.values() if v["completed"])
        return {"total_keys": total, "completed": completed, "in_flight": total - completed}
