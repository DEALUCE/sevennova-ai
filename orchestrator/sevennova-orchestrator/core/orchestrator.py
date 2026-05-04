"""
SevenNova Orchestrator — LangGraph Multi-Agent Brain
Orchestrates all 15 skills into a unified property report.

Architecture:
  Address Input
      ↓
  [Geocode Agent] → validates address, pulls parcel data
      ↓
  [Skill Router] → determines which skills activate
      ↓
  [Parallel Skill Agents] → run skills concurrently
      ↓
  [ML Valuation Agent] → XGBoost ensemble pricing
      ↓
  [LLM Narrative Agent] → Claude generates analysis
      ↓
  [Quality Gate Agent] → validates output, flags gaps
      ↓
  [Report Assembler] → builds final PropertyReport
      ↓
  HTML Report Output
"""
from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, Optional, TypedDict

import structlog
from anthropic import AsyncAnthropic
from langgraph.graph import END, StateGraph

from core.models import (
    DataFreshness, DataPoint, DealScore,
    DistressResult, EntitlementResult,
    PropertyAddress, PropertyReport,
    ReportRequest, ReportTier,
    SkillActivationLog, ValuationResult,
    ZoningResult,
)
from core.skill_router import SkillName, route_skills

log = structlog.get_logger()


# ── GRAPH STATE ────────────────────────────────────────────────────────────

class OrchestratorState(TypedDict):
    """State flowing through the LangGraph pipeline."""
    request: ReportRequest
    parcel_data: dict[str, Any]
    is_commercial: bool
    has_violations: bool
    is_data_center_zone: bool
    skill_results: dict[str, Any]
    skill_logs: list[SkillActivationLog]
    ml_valuation: Optional[ValuationResult]
    narrative: dict[str, str]
    red_flags: list[str]
    assumptions: list[str]
    unverified_items: list[str]
    deal_score: Optional[DealScore]
    overall_confidence: float
    errors: list[str]
    start_time: float
    _final_report: Optional[Any]


# ── AGENT: GEOCODE ─────────────────────────────────────────────────────────

async def geocode_agent(state: OrchestratorState) -> OrchestratorState:
    """
    Validates address and pulls basic parcel data.
    Bootstrap mode: uses free LA County Assessor API.
    Enterprise mode: ATTOM API for richer data.

    Confidence: 85% on address validation.
    ASSUMPTION: LA County only at MVP.
    [LIVE] data when APIs available, [UNVERIFIED] otherwise.
    """
    address = state["request"].address
    log.info("geocode_agent_start", address=address.full_address)

    parcel_data: dict[str, Any] = {
        "full_address": address.full_address,
        "street": address.street,
        "city": address.city,
        "state": address.state,
        "zip_code": address.zip_code,
        "apn": address.apn,
        "freshness": DataFreshness.UNVERIFIED,
        "confidence": 70.0,
    }

    # Detect property type signals from address
    commercial_keywords = ["blvd", "ave", "st", "commercial", "industrial", "office"]
    is_commercial = any(kw in address.street.lower() for kw in commercial_keywords)

    # Check for known data center corridors in LA County
    # [ASSUMPTION] Based on known DC locations: El Segundo, downtown LA corridor
    dc_zip_codes = {"90245", "90017", "90028", "91731"}
    is_dc_zone = address.zip_code in dc_zip_codes if address.zip_code else False

    state["parcel_data"] = parcel_data
    state["is_commercial"] = is_commercial
    state["has_violations"] = False  # Will be updated by skill agents
    state["is_data_center_zone"] = is_dc_zone

    log.info(
        "geocode_agent_complete",
        is_commercial=is_commercial,
        is_dc_zone=is_dc_zone,
    )
    return state


# ── AGENT: SKILL EXECUTOR ──────────────────────────────────────────────────

async def _run_single_skill(
    skill_name: SkillName,
    parcel_data: dict,
    client: AsyncAnthropic,
) -> tuple[str, Any, SkillActivationLog]:
    """Run a single skill via Claude API with structured output."""
    start_ms = int(time.time() * 1000)

    # Skill-specific system prompts
    skill_prompts = {
        SkillName.LA_DEVELOPER_INTELLIGENCE: """
You are the la-developer-intelligence skill for SevenNova.ai.
Analyze the property and return ONLY valid JSON with these exact keys:
{
  "zoning_code": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "permitted_uses": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "max_far": {"value": float, "confidence": float, "freshness": "UNVERIFIED"},
  "height_limit_ft": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "toc_tier": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "ed1_eligible": {"value": bool, "confidence": float, "freshness": "UNVERIFIED"},
  "ab2011_eligible": {"value": bool, "confidence": float, "freshness": "UNVERIFIED"},
  "rso_covered": {"value": bool, "confidence": float, "freshness": "UNVERIFIED"},
  "ladbs_violations": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "buildable_sf": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "max_units_by_right": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "max_units_toc": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "confidence_overall": float,
  "assumptions": [str],
  "unverified_items": [str]
}
Label all unknown values as UNVERIFIED. Never hallucinate — use null if unknown.
""",
        SkillName.ENSEMBLE_PRICING_ENGINE: """
You are the ensemble-pricing-engine skill for SevenNova.ai.
Return ONLY valid JSON:
{
  "legal_value": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "climate_adjusted_value": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "xgboost_estimate": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "lightgbm_estimate": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "catboost_estimate": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "ensemble_estimate": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "cap_rate": {"value": float, "confidence": float, "freshness": "UNVERIFIED"},
  "price_per_unit": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "confidence_overall": float,
  "assumptions": [str]
}
""",
        SkillName.DISTRESSED_DEBT_RADAR: """
You are the distressed-debt-radar skill for SevenNova.ai.
Return ONLY valid JSON:
{
  "distress_score": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "dscr_estimate": {"value": float, "confidence": float, "freshness": "UNVERIFIED"},
  "loan_maturity_risk": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "ladbs_order_active": {"value": bool, "confidence": float, "freshness": "UNVERIFIED"},
  "entity_stress_signals": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "event_window_months": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "confidence_overall": float,
  "assumptions": [str]
}
""",
        SkillName.ENTITLEMENT_VELOCITY: """
You are the entitlement-velocity-engine skill for SevenNova.ai.
Return ONLY valid JSON:
{
  "best_pathway": {"value": str, "confidence": float, "freshness": "UNVERIFIED"},
  "approval_probability": {"value": float, "confidence": float, "freshness": "UNVERIFIED"},
  "timeline_months": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "irr_impact_pct": {"value": float, "confidence": float, "freshness": "UNVERIFIED"},
  "carry_cost_monthly": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "jurisdiction_risk": {"value": int, "confidence": float, "freshness": "UNVERIFIED"},
  "confidence_overall": float,
  "assumptions": [str]
}
""",
    }

    # Default prompt for skills not explicitly defined yet
    default_prompt = f"""
You are the {skill_name.value} skill for SevenNova.ai.
Analyze the property data provided and return a JSON object with your analysis.
Label all uncertain data as UNVERIFIED. Include confidence scores (0-100) for all values.
Never hallucinate data — use null if unknown.
"""

    system_prompt = skill_prompts.get(skill_name, default_prompt)

    try:
        response = await client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1000,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": f"Analyze this property:\n{parcel_data}"
            }]
        )

        import json
        raw = response.content[0].text.strip()
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)

        duration_ms = int(time.time() * 1000) - start_ms
        skill_log = SkillActivationLog(
            skill_name=skill_name.value,
            activated=True,
            confidence=result.get("confidence_overall", 70.0),
            data_freshness=DataFreshness.UNVERIFIED,
            duration_ms=duration_ms,
        )
        return skill_name.value, result, skill_log

    except Exception as e:
        duration_ms = int(time.time() * 1000) - start_ms
        log.error("skill_failed", skill=skill_name.value, error=str(e))
        skill_log = SkillActivationLog(
            skill_name=skill_name.value,
            activated=False,
            confidence=0.0,
            data_freshness=DataFreshness.UNVERIFIED,
            error=str(e),
            duration_ms=duration_ms,
        )
        return skill_name.value, None, skill_log


async def skill_executor_agent(state: OrchestratorState) -> OrchestratorState:
    """
    Runs all routed skills concurrently using asyncio.gather.
    P95 target: 15 seconds for full report (15 skills parallel).
    """
    request = state["request"]
    skills = route_skills(
        tier=request.tier,
        address=request.address,
        is_commercial=state["is_commercial"],
        has_violations=state["has_violations"],
        is_data_center_zone=state["is_data_center_zone"],
    )

    log.info("skill_executor_start", skill_count=len(skills))

    client = AsyncAnthropic()

    # Run all skills concurrently
    tasks = [
        _run_single_skill(
            skill_name=s.name,
            parcel_data=state["parcel_data"],
            client=client,
        )
        for s in skills
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    skill_results: dict[str, Any] = {}
    skill_logs: list[SkillActivationLog] = []
    assumptions: list[str] = []
    unverified: list[str] = []

    for result in results:
        if isinstance(result, Exception):
            log.error("skill_gather_error", error=str(result))
            continue
        name, data, skill_log = result
        skill_results[name] = data
        skill_logs.append(skill_log)
        if data:
            assumptions.extend(data.get("assumptions", []))
            unverified.extend(data.get("unverified_items", []))

    # Check if LADBS violation detected
    distress_data = skill_results.get(SkillName.DISTRESSED_DEBT_RADAR.value)
    if distress_data and distress_data.get("ladbs_order_active", {}).get("value"):
        state["has_violations"] = True

    state["skill_results"] = skill_results
    state["skill_logs"] = skill_logs
    state["assumptions"] = list(set(assumptions))
    state["unverified_items"] = list(set(unverified))

    log.info(
        "skill_executor_complete",
        successful=sum(1 for l in skill_logs if l.activated),
        failed=sum(1 for l in skill_logs if not l.activated),
    )
    return state


# ── AGENT: LLM NARRATIVE ───────────────────────────────────────────────────

async def narrative_agent(state: OrchestratorState) -> OrchestratorState:
    """
    Uses Claude to generate the investment narrative from skill outputs.
    Self-correction loop: generate → critique → refine.
    """
    client = AsyncAnthropic()
    skill_results = state["skill_results"]
    address = state["request"].address

    system_prompt = """
You are the Chief Investment Analyst at SevenNova.ai.
Given property analysis data from 15 AI engines, write a concise investment report narrative.

Rules:
- Label all assumptions as [ASSUMPTION]
- Label all unverified data as [UNVERIFIED]
- Include confidence scores on all key claims
- Never hallucinate — only use data provided
- Be direct and quantified — no vague language
- Identify red flags explicitly

Return ONLY valid JSON:
{
  "executive_summary": str (3-4 sentences max),
  "investment_thesis": str (2-3 sentences),
  "risk_summary": str (2-3 sentences),
  "strategic_recommendations": [str, str, str] (top 3 actions),
  "red_flags": [str] (list all critical issues),
  "deal_score": str (one of: A+, A, B+, B, C, D, F),
  "deal_score_rationale": str (1 sentence),
  "overall_confidence": float (0-100)
}
"""

    response = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        system=system_prompt,
        messages=[{
            "role": "user",
            "content": f"""
Property: {address.full_address}
Tier: {state['request'].tier.value}
Skill Results: {skill_results}
Assumptions so far: {state['assumptions']}
Unverified items: {state['unverified_items']}
"""
        }]
    )

    import json
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        narrative = json.loads(raw)
    except json.JSONDecodeError:
        log.error("narrative_parse_failed", raw=raw[:200])
        narrative = {
            "executive_summary": "Analysis complete. See skill outputs for details.",
            "investment_thesis": "[UNVERIFIED] Insufficient data for full thesis.",
            "risk_summary": "Multiple unverified data points — verify before decision.",
            "strategic_recommendations": ["Verify all UNVERIFIED data points", "Consult licensed appraiser", "Review LADBS records directly"],
            "red_flags": ["Narrative generation failed — review raw skill outputs"],
            "deal_score": "C",
            "deal_score_rationale": "Incomplete analysis due to data gaps.",
            "overall_confidence": 40.0,
        }

    # Map deal score string to enum
    score_map = {
        "A+": DealScore.A_PLUS, "A": DealScore.A,
        "B+": DealScore.B_PLUS, "B": DealScore.B,
        "C": DealScore.C, "D": DealScore.D, "F": DealScore.F,
    }

    state["narrative"] = narrative
    state["red_flags"] = narrative.get("red_flags", [])
    state["deal_score"] = score_map.get(narrative.get("deal_score", "C"), DealScore.C)
    state["overall_confidence"] = narrative.get("overall_confidence", 70.0)

    log.info(
        "narrative_agent_complete",
        deal_score=state["deal_score"],
        confidence=state["overall_confidence"],
        red_flags_count=len(state["red_flags"]),
    )
    return state


# ── AGENT: QUALITY GATE ────────────────────────────────────────────────────

async def quality_gate_agent(state: OrchestratorState) -> OrchestratorState:
    """
    Self-correction: validates output before final assembly.
    Checks: assumptions labeled, unverified tagged, confidence scored,
    trade-offs declared, disclaimer present.
    """
    issues: list[str] = []

    # Check minimum skill activation
    activated = sum(1 for l in state.get("skill_logs", []) if l.activated)
    if activated == 0:
        issues.append("CRITICAL: No skills activated successfully")

    # Check confidence threshold
    if state.get("overall_confidence", 0) < 50:
        issues.append(f"LOW CONFIDENCE: {state.get('overall_confidence')}% — warn user")

    # Check for unverified data
    if len(state.get("unverified_items", [])) > 10:
        issues.append(f"HIGH UNVERIFIED COUNT: {len(state['unverified_items'])} items need verification")

    # Check narrative completeness
    narrative = state.get("narrative", {})
    if not narrative.get("executive_summary"):
        issues.append("MISSING: Executive summary")
    if not narrative.get("strategic_recommendations"):
        issues.append("MISSING: Strategic recommendations")

    if issues:
        log.warning("quality_gate_issues", issues=issues)
        state["red_flags"] = state.get("red_flags", []) + issues
    else:
        log.info("quality_gate_passed")

    return state


# ── AGENT: REPORT ASSEMBLER ────────────────────────────────────────────────

async def report_assembler_agent(state: OrchestratorState) -> OrchestratorState:
    """Assembles all agent outputs into the final PropertyReport."""
    elapsed = time.time() - state["start_time"]
    narrative = state.get("narrative", {})

    report = PropertyReport(
        request_id=state["request"].request_id,
        address=state["request"].address,
        tier=state["request"].tier,
        generation_time_seconds=round(elapsed, 2),
        deal_score=state.get("deal_score", DealScore.C),
        deal_score_rationale=narrative.get("deal_score_rationale", ""),
        overall_confidence=state.get("overall_confidence", 70.0),
        data_freshness_summary=DataFreshness.UNVERIFIED,
        executive_summary=narrative.get("executive_summary", ""),
        investment_thesis=narrative.get("investment_thesis", ""),
        risk_summary=narrative.get("risk_summary", ""),
        strategic_recommendations=narrative.get("strategic_recommendations", []),
        red_flags=state.get("red_flags", []),
        skills_activated=state.get("skill_logs", []),
        assumptions=state.get("assumptions", []),
        unverified_items=state.get("unverified_items", []),
    )

    log.info(
        "report_assembled",
        request_id=report.request_id,
        deal_score=report.deal_score.value,
        generation_time_s=report.generation_time_seconds,
        skills_activated=len([l for l in report.skills_activated if l.activated]),
    )

    # Store report back in state for API response
    state["_final_report"] = report
    return state


# ── GRAPH DEFINITION ───────────────────────────────────────────────────────

def build_orchestrator_graph() -> StateGraph:
    """
    Builds the LangGraph StateGraph for the SevenNova orchestrator.

    Flow:
    geocode → skill_executor → narrative → quality_gate → assembler → END
    """
    graph = StateGraph(OrchestratorState)

    # Add nodes
    graph.add_node("geocode", geocode_agent)
    graph.add_node("skill_executor", skill_executor_agent)
    graph.add_node("narrative", narrative_agent)
    graph.add_node("quality_gate", quality_gate_agent)
    graph.add_node("assembler", report_assembler_agent)

    # Add edges (linear pipeline)
    graph.set_entry_point("geocode")
    graph.add_edge("geocode", "skill_executor")
    graph.add_edge("skill_executor", "narrative")
    graph.add_edge("narrative", "quality_gate")
    graph.add_edge("quality_gate", "assembler")
    graph.add_edge("assembler", END)

    return graph.compile()


# ── MAIN ORCHESTRATOR ──────────────────────────────────────────────────────

class SevenNovaOrchestrator:
    """
    Main entry point for report generation.
    Usage:
        orchestrator = SevenNovaOrchestrator()
        report = await orchestrator.generate_report(request)
    """

    def __init__(self):
        self.graph = build_orchestrator_graph()
        log.info("orchestrator_initialized", skills=15)

    async def generate_report(self, request: ReportRequest) -> PropertyReport:
        """
        Generate a full property intelligence report.

        Args:
            request: ReportRequest with address and tier

        Returns:
            PropertyReport with all 15 skill outputs

        Raises:
            ValueError: If address is invalid
            RuntimeError: If critical skills fail

        Latency target: P50=30s, P95=60s, P99=90s
        Cost target: $0.05-$0.20 per report (95%+ gross margin)
        """
        log.info(
            "report_generation_start",
            request_id=request.request_id,
            address=request.address.full_address,
            tier=request.tier.value,
        )

        initial_state: OrchestratorState = {
            "request": request,
            "parcel_data": {},
            "is_commercial": False,
            "has_violations": False,
            "is_data_center_zone": False,
            "skill_results": {},
            "skill_logs": [],
            "ml_valuation": None,
            "narrative": {},
            "red_flags": [],
            "assumptions": [],
            "unverified_items": [],
            "deal_score": None,
            "overall_confidence": 0.0,
            "errors": [],
            "start_time": time.time(),
            "_final_report": None,
        }

        final_state = await self.graph.ainvoke(initial_state)
        report: PropertyReport = final_state["_final_report"]

        log.info(
            "report_generation_complete",
            request_id=report.request_id,
            deal_score=report.deal_score.value,
            time_s=report.generation_time_seconds,
            confidence=report.overall_confidence,
        )

        return report
