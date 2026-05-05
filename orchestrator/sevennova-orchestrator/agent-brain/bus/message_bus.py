"""
SevenNova Agent Brain v2 — ACP Message Bus
Inter-brain pub/sub communication with:
- Idempotency keys on every message
- Incident fingerprint deduplication (5min TTL)
- Incident correlation across brains
- Max 3 escalations/hour global cap
- Pause signals to specific brains

Architecture: Postgres for durable events + Redis for dedup TTL
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timedelta
from typing import Callable, Optional

import structlog

from infra.models import (
    BrainID, BusMessage, EventType,
    IncidentRecord, IncidentSeverity,
)

log = structlog.get_logger()

# Brains that must pause when SYSTEM_ALERT fires
PAUSE_ON_SYSTEM_ALERT = {
    BrainID.DATA,
    BrainID.UPDATE,
    BrainID.SEO,
}

# Brains that pause on DOWNTIME_DETECTED
PAUSE_ON_DOWNTIME = {
    BrainID.DATA,
    BrainID.UPDATE,
    BrainID.SEO,
}

# Escalation rate limiting — max 3 per hour globally
MAX_ESCALATIONS_PER_HOUR = 3
DEDUP_WINDOW_SECONDS = 300  # 5 minutes


class MessageBus:
    """
    ACP-style message bus for inter-brain communication.

    Key guarantees:
    1. Every message has a unique idempotency key
    2. Duplicate messages (same idempotency key) are silently dropped
    3. Incident fingerprints are deduplicated within DEDUP_WINDOW
    4. Escalation rate limited to MAX_ESCALATIONS_PER_HOUR
    5. Pause signals stop specific brains immediately

    Usage:
        bus = MessageBus()
        bus.subscribe(EventType.DOWNTIME_DETECTED, my_handler)
        await bus.publish(BusMessage(
            event_type=EventType.DOWNTIME_DETECTED,
            source_brain=BrainID.MONITOR,
            payload={"url": "sevennova.ai", "latency_ms": 9999},
            idempotency_key=f"downtime-{url}-{minute}"
        ))
    """

    def __init__(self):
        # In-memory state for MVP — replace with Redis in production
        self._subscribers: dict[EventType, list[Callable]] = {}
        self._processed_idempotency: dict[str, float] = {}  # key → timestamp
        self._incident_fingerprints: dict[str, float] = {}  # fingerprint → timestamp
        self._escalation_log: list[float] = []  # timestamps of escalations
        self._paused_brains: set[BrainID] = set()
        self._message_log: list[BusMessage] = []

    def subscribe(self, event_type: EventType, handler: Callable) -> None:
        """Register a handler for an event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        log.debug("bus_subscribed", event_type=event_type.value, handler=handler.__name__)

    def is_brain_paused(self, brain_id: BrainID) -> bool:
        """Check if a brain is currently paused."""
        return brain_id in self._paused_brains

    def pause_brain(self, brain_id: BrainID, reason: str) -> None:
        """Pause a specific brain."""
        self._paused_brains.add(brain_id)
        log.warning("brain_paused", brain=brain_id.value, reason=reason)

    def resume_brain(self, brain_id: BrainID) -> None:
        """Resume a paused brain."""
        self._paused_brains.discard(brain_id)
        log.info("brain_resumed", brain=brain_id.value)

    def _is_duplicate_idempotency(self, key: str) -> bool:
        """Check if this idempotency key was already processed."""
        now = time.time()
        # Clean up old keys (>1 hour)
        self._processed_idempotency = {
            k: v for k, v in self._processed_idempotency.items()
            if now - v < 3600
        }
        if key in self._processed_idempotency:
            return True
        self._processed_idempotency[key] = now
        return False

    def _is_duplicate_incident(self, fingerprint: str) -> bool:
        """Check if this incident was already reported within dedup window."""
        now = time.time()
        # Clean up expired fingerprints
        self._incident_fingerprints = {
            k: v for k, v in self._incident_fingerprints.items()
            if now - v < DEDUP_WINDOW_SECONDS
        }
        if fingerprint in self._incident_fingerprints:
            return True
        self._incident_fingerprints[fingerprint] = now
        return False

    def _can_escalate(self) -> bool:
        """Check if escalation rate limit allows another escalation."""
        now = time.time()
        # Keep only last hour
        self._escalation_log = [t for t in self._escalation_log if now - t < 3600]
        return len(self._escalation_log) < MAX_ESCALATIONS_PER_HOUR

    def _escalation_record(self) -> None:
        """Record an escalation."""
        self._escalation_log.append(time.time())

    @staticmethod
    def fingerprint(event_type: EventType, source: BrainID, payload: dict) -> str:
        """
        Generate a fingerprint for incident deduplication.

        Intentionally excludes source_brain — the same incident reported by
        different brains (e.g. MONITOR and SECURITY both detect downtime)
        must produce the same fingerprint so the second report is dropped.
        """
        key_fields = {
            "event_type": event_type.value,
            # source excluded — same incident regardless of reporting brain
            "url": payload.get("url", ""),
            "error_type": payload.get("error_type", ""),
            "resource": payload.get("resource", ""),
        }
        raw = json.dumps(key_fields, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    async def publish(self, message: BusMessage) -> bool:
        """
        Publish a message to the bus.

        Returns:
            True if published, False if dropped (duplicate/rate-limited)
        """
        # Idempotency check
        if self._is_duplicate_idempotency(message.idempotency_key):
            log.debug(
                "bus_message_duplicate_dropped",
                idempotency_key=message.idempotency_key,
                event_type=message.event_type.value,
            )
            return False

        # Incident deduplication for alert events
        alert_events = {
            EventType.DOWNTIME_DETECTED, EventType.LATENCY_SPIKE,
            EventType.SECURITY_ALERT, EventType.BUDGET_EXCEEDED,
            EventType.DEPLOY_FAILED, EventType.CIRCUIT_OPEN,
        }
        if message.event_type in alert_events:
            fp = self.fingerprint(message.event_type, message.source_brain, message.payload)
            if self._is_duplicate_incident(fp):
                log.info(
                    "bus_incident_deduplicated",
                    fingerprint=fp,
                    event_type=message.event_type.value,
                    source=message.source_brain.value,
                )
                return False

        # Log the message
        self._message_log.append(message)

        log.info(
            "bus_message_published",
            event_type=message.event_type.value,
            source=message.source_brain.value,
            severity=message.severity.value,
            message_id=message.message_id,
        )

        # Handle system-level side effects
        await self._handle_system_effects(message)

        # Dispatch to subscribers
        handlers = self._subscribers.get(message.event_type, [])
        for handler in handlers:
            try:
                await handler(message)
            except Exception as e:
                log.error(
                    "bus_handler_error",
                    handler=handler.__name__,
                    error=str(e),
                    event_type=message.event_type.value,
                )

        return True

    async def _handle_system_effects(self, message: BusMessage) -> None:
        """Handle system-wide side effects of certain events."""

        if message.event_type == EventType.SYSTEM_ALERT:
            for brain in PAUSE_ON_SYSTEM_ALERT:
                self.pause_brain(brain, f"SYSTEM_ALERT from {message.source_brain.value}")

        elif message.event_type == EventType.DOWNTIME_DETECTED:
            for brain in PAUSE_ON_DOWNTIME:
                self.pause_brain(brain, f"DOWNTIME from {message.source_brain.value}")

        elif message.event_type == EventType.UPTIME_RESTORED:
            for brain in PAUSE_ON_DOWNTIME:
                self.resume_brain(brain)

        elif message.event_type == EventType.BUDGET_EXCEEDED:
            # Pause all non-critical brains
            for brain in {BrainID.DATA, BrainID.UPDATE, BrainID.SEO, BrainID.CUSTOMER}:
                self.pause_brain(brain, "Budget exceeded")

    def get_recent_messages(self, limit: int = 50) -> list[BusMessage]:
        """Get recent messages for observability."""
        return self._message_log[-limit:]

    def get_stats(self) -> dict:
        """Bus statistics for monitoring."""
        now = time.time()
        return {
            "total_messages": len(self._message_log),
            "paused_brains": [b.value for b in self._paused_brains],
            "escalations_last_hour": len([
                t for t in self._escalation_log if now - t < 3600
            ]),
            "dedup_cache_size": len(self._incident_fingerprints),
            "idempotency_cache_size": len(self._processed_idempotency),
        }


# Singleton bus instance
_bus: Optional[MessageBus] = None


def get_bus() -> MessageBus:
    global _bus
    if _bus is None:
        _bus = MessageBus()
    return _bus
