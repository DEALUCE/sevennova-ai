"""
SevenNova Orchestrator — Core Data Models
All Pydantic models used across the system.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ── ENUMS ─────────────────────────────────────────────────────────────────

class DataFreshness(str, Enum):
    LIVE = "LIVE"           # pulled this session from authoritative source
    CACHED = "CACHED"       # reliable but may be outdated
    STALE = "STALE"         # >30 days old — warn user
    UNVERIFIED = "UNVERIFIED"  # model inference only

class ReportTier(str, Enum):
    BASIC = "basic"               # $49 — zoning + AVM
    FULL = "full"                 # $199 — all 15 skills
    INSTITUTIONAL = "institutional"  # $499 — + ownership + litigation

class TaskClassification(str, Enum):
    ARCHITECTURE = "ARCHITECTURE"
    DATA = "DATA"
    CODE = "CODE"
    FINANCIAL = "FINANCIAL"
    COMPLIANCE = "COMPLIANCE"
    RESEARCH = "RESEARCH"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ── PROPERTY INPUT ─────────────────────────────────────────────────────────

class PropertyAddress(BaseModel):
    """Validated property address input."""
    street: str = Field(..., description="Street address e.g. '3612 W Jefferson Blvd'")
    city: str = Field(default="Los Angeles")
    state: str = Field(default="CA")
    zip_code: Optional[str] = Field(default=None)
    apn: Optional[str] = Field(default=None, description="Assessor Parcel Number if known")

    @property
    def full_address(self) -> str:
        parts = [self.street, self.city, self.state]
        if self.zip_code:
            parts[-1] = f"{self.state} {self.zip_code}"
        return ", ".join(parts)


class ReportRequest(BaseModel):
    """Incoming report request from API or Stripe webhook."""
    address: PropertyAddress
    tier: ReportTier = ReportTier.FULL
    requester_email: Optional[str] = None
    requester_name: Optional[str] = None
    notes: Optional[str] = None
    request_id: str = Field(default_factory=lambda: __import__('uuid').uuid4().hex)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── SKILL OUTPUTS ──────────────────────────────────────────────────────────

class DataPoint(BaseModel):
    """A single verified/tagged data point."""
    value: Any
    freshness: DataFreshness
    source: str
    confidence: float = Field(ge=0.0, le=100.0, description="Confidence 0-100%")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


class ZoningResult(BaseModel):
    """Output from la-developer-intelligence skill."""
    zoning_code: DataPoint
    permitted_uses: DataPoint
    max_far: DataPoint
    height_limit_ft: DataPoint
    toc_tier: DataPoint
    ed1_eligible: DataPoint
    ab2011_eligible: DataPoint
    rso_covered: DataPoint
    ladbs_violations: DataPoint
    buildable_sf: DataPoint
    max_units_by_right: DataPoint
    max_units_toc: DataPoint
    skill: str = "la-developer-intelligence"
    confidence_overall: float = Field(ge=0.0, le=100.0)


class ValuationResult(BaseModel):
    """Output from ensemble-pricing-engine + climate-adjusted-avm."""
    legal_value: DataPoint
    climate_adjusted_value: DataPoint
    xgboost_estimate: DataPoint
    lightgbm_estimate: DataPoint
    catboost_estimate: DataPoint
    ensemble_estimate: DataPoint
    cap_rate: DataPoint
    price_per_unit: DataPoint
    diminution_estimate: Optional[DataPoint] = None
    skill: str = "ensemble-pricing-engine"
    confidence_overall: float = Field(ge=0.0, le=100.0)


class DistressResult(BaseModel):
    """Output from distressed-debt-radar skill."""
    distress_score: DataPoint       # 0-100
    dscr_estimate: DataPoint
    loan_maturity_risk: DataPoint
    ladbs_order_active: DataPoint
    entity_stress_signals: DataPoint
    event_window_months: DataPoint
    skill: str = "distressed-debt-radar"
    confidence_overall: float = Field(ge=0.0, le=100.0)


class OwnershipResult(BaseModel):
    """Output from llc-veil-piercing skill."""
    current_owner_entity: DataPoint
    beneficial_owners: DataPoint    # list of names/entities
    portfolio_count: DataPoint
    litigation_exposure: DataPoint
    motivation_score: DataPoint     # 0-100, higher = more motivated to sell
    lender: DataPoint
    skill: str = "llc-veil-piercing"
    confidence_overall: float = Field(ge=0.0, le=100.0)


class ClimateResult(BaseModel):
    """Output from climate-adjusted-avm skill."""
    flood_risk_score: DataPoint     # 0-10
    wildfire_risk_score: DataPoint  # 0-10
    heat_risk_score: DataPoint      # 0-10
    seismic_risk_score: DataPoint   # 0-10
    insurance_stress_score: DataPoint
    climate_haircut_pct: DataPoint  # % reduction from base AVM
    skill: str = "climate-adjusted-avm"
    confidence_overall: float = Field(ge=0.0, le=100.0)


class EntitlementResult(BaseModel):
    """Output from entitlement-velocity-engine skill."""
    best_pathway: DataPoint
    approval_probability: DataPoint  # 0-100%
    timeline_months: DataPoint
    irr_impact_pct: DataPoint
    carry_cost_monthly: DataPoint
    jurisdiction_risk: DataPoint    # 0-10
    skill: str = "entitlement-velocity-engine"
    confidence_overall: float = Field(ge=0.0, le=100.0)


# ── AGGREGATED REPORT ──────────────────────────────────────────────────────

class DealScore(str, Enum):
    A_PLUS = "A+"
    A = "A"
    B_PLUS = "B+"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


class SkillActivationLog(BaseModel):
    """Tracks which skills were activated and their status."""
    skill_name: str
    activated: bool
    confidence: float
    data_freshness: DataFreshness
    error: Optional[str] = None
    duration_ms: Optional[int] = None


class PropertyReport(BaseModel):
    """
    Master output model — full SevenNova report.
    All 15 skills feed into this.
    """
    # Metadata
    request_id: str
    address: PropertyAddress
    tier: ReportTier
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generation_time_seconds: Optional[float] = None

    # Core scores
    deal_score: DealScore
    deal_score_rationale: str
    overall_confidence: float = Field(ge=0.0, le=100.0)
    data_freshness_summary: DataFreshness

    # Skill outputs
    zoning: Optional[ZoningResult] = None
    valuation: Optional[ValuationResult] = None
    distress: Optional[DistressResult] = None
    ownership: Optional[OwnershipResult] = None
    climate: Optional[ClimateResult] = None
    entitlement: Optional[EntitlementResult] = None

    # LLM-generated narrative sections
    executive_summary: str = ""
    investment_thesis: str = ""
    risk_summary: str = ""
    strategic_recommendations: list[str] = []
    red_flags: list[str] = []

    # Skill activation log
    skills_activated: list[SkillActivationLog] = []

    # Assumptions and unverified items
    assumptions: list[str] = []
    unverified_items: list[str] = []

    # Mandatory disclaimer
    disclaimer: str = (
        "For informational purposes only. Not a licensed appraisal. "
        "Not legal advice. Consult a licensed professional before making "
        "any real estate or financial decision. © 2026 SevenNova.ai"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
