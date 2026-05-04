"""
SevenNova Orchestrator — Skill Router
Determines which of the 15 skills to activate based on:
- Report tier (basic/full/institutional)
- Property type signals
- Available data
- Cost budget per request
"""
from __future__ import annotations

import structlog
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from core.models import ReportTier, PropertyAddress

log = structlog.get_logger()


class SkillName(str, Enum):
    # Core skills
    LA_DEVELOPER_INTELLIGENCE = "la-developer-intelligence"
    ENTITLEMENT_VELOCITY = "entitlement-velocity-engine"
    DISTRESSED_DEBT_RADAR = "distressed-debt-radar"
    LLC_VEIL_PIERCING = "llc-veil-piercing"
    DATA_CENTER_INTELLIGENCE = "data-center-intelligence"
    GEOSPATIAL_ANALYSIS = "geospatial-analysis"
    LA_RENTAL_SITE_BUILDER = "la-rental-site-builder"
    TENANT_CREDIT_COLLAPSE = "tenant-credit-collapse"
    CLIMATE_ADJUSTED_AVM = "climate-adjusted-avm"
    ENSEMBLE_PRICING_ENGINE = "ensemble-pricing-engine"
    # Moat skills
    INSTITUTIONAL_CAPITAL_TRACKER = "institutional-capital-tracker"
    PRICING_ORACLE = "pricing-oracle"
    SATELLITE_CHANGE_DETECTOR = "satellite-change-detector"
    POWER_GRID_INTEL = "power-grid-intel"
    TENANT_DEMAND_SIGNAL = "tenant-demand-signal"


@dataclass
class SkillConfig:
    """Configuration for a single skill activation."""
    name: SkillName
    priority: int           # 1=highest, 5=lowest
    required: bool          # False = best-effort
    tier_minimum: ReportTier
    estimated_cost_usd: float  # API cost per activation
    estimated_ms: int          # latency contribution


# ── SKILL REGISTRY ─────────────────────────────────────────────────────────

SKILL_REGISTRY: dict[SkillName, SkillConfig] = {
    SkillName.LA_DEVELOPER_INTELLIGENCE: SkillConfig(
        name=SkillName.LA_DEVELOPER_INTELLIGENCE,
        priority=1, required=True,
        tier_minimum=ReportTier.BASIC,
        estimated_cost_usd=0.02, estimated_ms=3000
    ),
    SkillName.ENSEMBLE_PRICING_ENGINE: SkillConfig(
        name=SkillName.ENSEMBLE_PRICING_ENGINE,
        priority=1, required=True,
        tier_minimum=ReportTier.BASIC,
        estimated_cost_usd=0.01, estimated_ms=2000
    ),
    SkillName.CLIMATE_ADJUSTED_AVM: SkillConfig(
        name=SkillName.CLIMATE_ADJUSTED_AVM,
        priority=2, required=True,
        tier_minimum=ReportTier.BASIC,
        estimated_cost_usd=0.01, estimated_ms=1500
    ),
    SkillName.DISTRESSED_DEBT_RADAR: SkillConfig(
        name=SkillName.DISTRESSED_DEBT_RADAR,
        priority=1, required=True,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.02, estimated_ms=2500
    ),
    SkillName.ENTITLEMENT_VELOCITY: SkillConfig(
        name=SkillName.ENTITLEMENT_VELOCITY,
        priority=2, required=True,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.02, estimated_ms=2000
    ),
    SkillName.GEOSPATIAL_ANALYSIS: SkillConfig(
        name=SkillName.GEOSPATIAL_ANALYSIS,
        priority=2, required=True,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.01, estimated_ms=1500
    ),
    SkillName.TENANT_CREDIT_COLLAPSE: SkillConfig(
        name=SkillName.TENANT_CREDIT_COLLAPSE,
        priority=3, required=False,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.02, estimated_ms=2000
    ),
    SkillName.TENANT_DEMAND_SIGNAL: SkillConfig(
        name=SkillName.TENANT_DEMAND_SIGNAL,
        priority=3, required=False,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.02, estimated_ms=2000
    ),
    SkillName.LLC_VEIL_PIERCING: SkillConfig(
        name=SkillName.LLC_VEIL_PIERCING,
        priority=1, required=True,
        tier_minimum=ReportTier.INSTITUTIONAL,
        estimated_cost_usd=0.03, estimated_ms=3000
    ),
    SkillName.INSTITUTIONAL_CAPITAL_TRACKER: SkillConfig(
        name=SkillName.INSTITUTIONAL_CAPITAL_TRACKER,
        priority=2, required=False,
        tier_minimum=ReportTier.INSTITUTIONAL,
        estimated_cost_usd=0.03, estimated_ms=2500
    ),
    SkillName.PRICING_ORACLE: SkillConfig(
        name=SkillName.PRICING_ORACLE,
        priority=2, required=True,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.01, estimated_ms=1000
    ),
    SkillName.SATELLITE_CHANGE_DETECTOR: SkillConfig(
        name=SkillName.SATELLITE_CHANGE_DETECTOR,
        priority=3, required=False,
        tier_minimum=ReportTier.INSTITUTIONAL,
        estimated_cost_usd=0.05, estimated_ms=5000
    ),
    SkillName.POWER_GRID_INTEL: SkillConfig(
        name=SkillName.POWER_GRID_INTEL,
        priority=4, required=False,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.01, estimated_ms=1000
    ),
    SkillName.DATA_CENTER_INTELLIGENCE: SkillConfig(
        name=SkillName.DATA_CENTER_INTELLIGENCE,
        priority=4, required=False,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.02, estimated_ms=2000
    ),
    SkillName.LA_RENTAL_SITE_BUILDER: SkillConfig(
        name=SkillName.LA_RENTAL_SITE_BUILDER,
        priority=5, required=False,
        tier_minimum=ReportTier.FULL,
        estimated_cost_usd=0.03, estimated_ms=3000
    ),
}

# Tier hierarchy for comparison
TIER_ORDER = {
    ReportTier.BASIC: 0,
    ReportTier.FULL: 1,
    ReportTier.INSTITUTIONAL: 2,
}


def route_skills(
    tier: ReportTier,
    address: PropertyAddress,
    is_commercial: bool = False,
    has_violations: bool = False,
    is_data_center_zone: bool = False,
) -> list[SkillConfig]:
    """
    Route request to the appropriate subset of 15 skills.

    Args:
        tier: Report tier determines which skills are eligible
        address: Property address for geographic routing
        is_commercial: Commercial properties activate tenant skills
        has_violations: Known LADBS violations activate distress skills
        is_data_center_zone: Near data center activates DC skills

    Returns:
        Ordered list of SkillConfig to activate (priority sorted)

    Confidence: 90% — routing logic is deterministic given inputs.
    ASSUMPTION: LA County geography only at MVP stage.
    """
    activated: list[SkillConfig] = []
    tier_level = TIER_ORDER[tier]

    for skill_name, config in SKILL_REGISTRY.items():
        min_tier_level = TIER_ORDER[config.tier_minimum]

        # Skip if tier too low
        if tier_level < min_tier_level:
            continue

        # Always include if required for tier
        if config.required:
            activated.append(config)
            continue

        # Conditional skill activation
        if skill_name == SkillName.TENANT_CREDIT_COLLAPSE and is_commercial:
            activated.append(config)
        elif skill_name == SkillName.TENANT_DEMAND_SIGNAL and is_commercial:
            activated.append(config)
        elif skill_name == SkillName.DATA_CENTER_INTELLIGENCE and is_data_center_zone:
            activated.append(config)
        elif skill_name == SkillName.POWER_GRID_INTEL and is_data_center_zone:
            activated.append(config)
        elif skill_name == SkillName.SATELLITE_CHANGE_DETECTOR and tier_level >= TIER_ORDER[ReportTier.INSTITUTIONAL]:
            activated.append(config)
        elif skill_name == SkillName.LA_RENTAL_SITE_BUILDER:
            # Only activate on explicit request — not auto
            pass
        else:
            # Include optional skills for full+ tiers
            if tier_level >= TIER_ORDER[ReportTier.FULL] and not config.required:
                activated.append(config)

    # Sort by priority (1=highest first)
    activated.sort(key=lambda s: s.priority)

    total_cost = sum(s.estimated_cost_usd for s in activated)
    total_ms = sum(s.estimated_ms for s in activated)

    log.info(
        "skill_routing_complete",
        tier=tier.value,
        skills_count=len(activated),
        estimated_cost_usd=round(total_cost, 4),
        estimated_latency_ms=total_ms,
        skills=[s.name.value for s in activated],
    )

    return activated


def estimate_report_cost(tier: ReportTier) -> dict:
    """
    Estimate cost breakdown for a report tier.
    Used for pricing validation and margin analysis.
    """
    skills = route_skills(tier=tier, address=PropertyAddress(street="test"))
    api_cost = sum(s.estimated_cost_usd for s in skills)
    llm_cost = 0.05  # Claude API for narrative generation
    infra_cost = 0.002  # Cloudflare + compute

    total = api_cost + llm_cost + infra_cost
    prices = {
        ReportTier.BASIC: 49.0,
        ReportTier.FULL: 199.0,
        ReportTier.INSTITUTIONAL: 499.0,
    }
    price = prices[tier]
    margin = (price - total) / price * 100

    return {
        "tier": tier.value,
        "price_usd": price,
        "cost_usd": round(total, 4),
        "gross_margin_pct": round(margin, 1),
        "skills_activated": len(skills),
        "cost_breakdown": {
            "api_costs": round(api_cost, 4),
            "llm_narrative": llm_cost,
            "infra": infra_cost,
        }
    }
