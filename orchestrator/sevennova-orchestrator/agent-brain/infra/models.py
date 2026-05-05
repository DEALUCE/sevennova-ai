"""
SevenNova Agent Brain v2 — Core Models
All Pydantic models, enums, and shared types.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── ENUMS ──────────────────────────────────────────────────────────────────

class BrainID(str, Enum):
    SUPERVISOR = "supervisor"
    MONITOR    = "SB-01-monitor"
    DATA       = "SB-02-data"
    UPDATE     = "SB-03-update"
    QUALITY    = "SB-04-quality"
    COST       = "SB-05-cost"
    SECURITY   = "SB-06-security"
    CUSTOMER   = "SB-07-customer"
    SEO        = "SB-08-seo"


class EventType(str, Enum):
    # System events
    SYSTEM_ALERT        = "SYSTEM_ALERT"
    HEARTBEAT           = "HEARTBEAT"
    # Monitor events
    DOWNTIME_DETECTED   = "DOWNTIME_DETECTED"
    UPTIME_RESTORED     = "UPTIME_RESTORED"
    LATENCY_SPIKE       = "LATENCY_SPIKE"
    # Data events
    DATA_SCRAPE_DONE    = "DATA_SCRAPE_DONE"
    RAG_UPDATED         = "RAG_UPDATED"
    SCHEMA_DRIFT        = "SCHEMA_DRIFT"
    # Update events
    DEPLOY_OK           = "DEPLOY_OK"
    DEPLOY_FAILED       = "DEPLOY_FAILED"
    PR_CREATED          = "PR_CREATED"
    # Quality events
    QUALITY_PASS        = "QUALITY_PASS"
    QUALITY_FAIL        = "QUALITY_FAIL"
    # Cost events
    BUDGET_80PCT        = "BUDGET_80PCT"
    BUDGET_EXCEEDED     = "BUDGET_EXCEEDED"
    CIRCUIT_OPEN        = "CIRCUIT_OPEN"
    # Security events
    SECURITY_ALERT      = "SECURITY_ALERT"
    # Customer events
    LEAD_SCORED         = "LEAD_SCORED"
    CHURN_RISK          = "CHURN_RISK"
    # SEO events
    RANK_DROP           = "RANK_DROP"
    CONTENT_DRAFTED     = "CONTENT_DRAFTED"


class PrivilegeTier(int, Enum):
    """
    Graduated privilege system.
    T1: auto-fix (no human needed)
    T2: propose via GitHub PR (Dan approves)
    T3: escalate only (human-only action)
    """
    T1_AUTO    = 1
    T2_PROPOSE = 2
    T3_ESCALATE = 3


class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"
    INFO     = "INFO"


class CircuitState(str, Enum):
    CLOSED   = "CLOSED"    # Normal operation
    OPEN     = "OPEN"      # Failing — block calls
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


# ── MESSAGE BUS ────────────────────────────────────────────────────────────

class BusMessage(BaseModel):
    """
    ACP-style message for the inter-brain message bus.
    Every message has a unique idempotency key.
    """
    message_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    idempotency_key: str = Field(default_factory=lambda: uuid.uuid4().hex)
    event_type: EventType
    source_brain: BrainID
    payload: dict[str, Any] = Field(default_factory=dict)
    severity: IncidentSeverity = IncidentSeverity.INFO
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: Optional[str] = None  # Links related messages


class IncidentRecord(BaseModel):
    """
    Unified incident log entry with fingerprint for deduplication.
    """
    incident_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    fingerprint: str  # SHA256 of (event_type + source + key_payload_fields)
    event_type: EventType
    source_brain: BrainID
    severity: IncidentSeverity
    description: str
    escalated: bool = False
    escalation_count: int = 0
    resolved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    actions_taken: list[str] = Field(default_factory=list)


# ── AGENT ACTION ───────────────────────────────────────────────────────────

class AgentAction(BaseModel):
    """
    Every action taken by any brain.
    Idempotency key prevents duplicate execution.
    """
    action_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    idempotency_key: str  # Must be set by caller — unique per intended operation
    brain_id: BrainID
    tier: PrivilegeTier
    action_type: str
    description: str
    payload: dict[str, Any] = Field(default_factory=dict)
    executed: bool = False
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None


# ── CIRCUIT BREAKER ────────────────────────────────────────────────────────

class CircuitBreakerState(BaseModel):
    """Per-tool circuit breaker state stored in Redis."""
    tool_name: str
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    failure_rate: float = 0.0
    last_failure: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    cooldown_until: Optional[datetime] = None
    total_calls: int = 0
    window_calls: int = 0
    window_failures: int = 0


# ── CUSTOMER CRM STATE ─────────────────────────────────────────────────────

class LeadStage(str, Enum):
    NEW         = "new"
    CONTACTED   = "contacted"
    QUALIFIED   = "qualified"
    DEMO        = "demo"
    PROPOSAL    = "proposal"
    CUSTOMER    = "customer"
    CHURNED     = "churned"


class CustomerState(BaseModel):
    """CRM state for a single customer/lead. Persisted in Postgres."""
    customer_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    email: str
    name: Optional[str] = None
    stage: LeadStage = LeadStage.NEW
    lead_score: float = Field(default=0.0, ge=0, le=100)
    churn_risk: float = Field(default=0.0, ge=0, le=100)
    reports_purchased: int = 0
    total_spent_usd: float = 0.0
    last_contact: Optional[datetime] = None
    next_followup: Optional[datetime] = None
    touchpoints: list[dict] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    tier: str = "basic"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ── HEALTH CHECK ───────────────────────────────────────────────────────────

class HealthStatus(str, Enum):
    HEALTHY   = "HEALTHY"
    DEGRADED  = "DEGRADED"
    DOWN      = "DOWN"
    UNKNOWN   = "UNKNOWN"


class EndpointHealth(BaseModel):
    url: str
    status: HealthStatus = HealthStatus.UNKNOWN
    latency_ms: Optional[float] = None
    status_code: Optional[int] = None
    error: Optional[str] = None
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class SystemHealth(BaseModel):
    """Aggregated health snapshot for the entire platform."""
    overall: HealthStatus = HealthStatus.UNKNOWN
    endpoints: list[EndpointHealth] = Field(default_factory=list)
    p50_ms: Optional[float] = None
    p95_ms: Optional[float] = None
    p99_ms: Optional[float] = None
    error_rate_pct: float = 0.0
    checked_at: datetime = Field(default_factory=datetime.utcnow)


# ── BRAIN RUN LOG ──────────────────────────────────────────────────────────

class BrainRunLog(BaseModel):
    """Episodic memory — every brain run is logged here."""
    run_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    brain_id: BrainID
    cron_schedule: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    success: bool = False
    actions_taken: list[str] = Field(default_factory=list)
    events_published: list[str] = Field(default_factory=list)
    tokens_used: int = 0
    cost_usd: float = 0.0
    error: Optional[str] = None

    @property
    def duration_seconds(self) -> Optional[float]:
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
