"""
SevenNova Orchestrator — Test Suite
pytest unit + integration tests.
Target: >80% coverage.

Run: pytest tests/ -v --cov=core --cov=api --cov-report=term-missing
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock

from core.models import (
    DataFreshness, PropertyAddress, ReportRequest,
    ReportTier, DealScore,
)
from core.skill_router import (
    SkillName, route_skills, estimate_report_cost, TIER_ORDER
)
from core.orchestrator import (
    SevenNovaOrchestrator, OrchestratorState,
    geocode_agent, quality_gate_agent,
)


# ── FIXTURES ───────────────────────────────────────────────────────────────

@pytest.fixture
def jefferson_address():
    return PropertyAddress(
        street="3612 W Jefferson Blvd",
        city="Los Angeles",
        state="CA",
        zip_code="90016",
        apn="5046-001-001",
    )


@pytest.fixture
def basic_request(jefferson_address):
    return ReportRequest(
        address=jefferson_address,
        tier=ReportTier.BASIC,
        requester_email="test@sevennova.ai",
    )


@pytest.fixture
def full_request(jefferson_address):
    return ReportRequest(
        address=jefferson_address,
        tier=ReportTier.FULL,
    )


@pytest.fixture
def institutional_request(jefferson_address):
    return ReportRequest(
        address=jefferson_address,
        tier=ReportTier.INSTITUTIONAL,
    )


# ── UNIT: SKILL ROUTER ────────────────────────────────────────────────────

class TestSkillRouter:

    def test_basic_tier_activates_minimum_skills(self, jefferson_address):
        skills = route_skills(tier=ReportTier.BASIC, address=jefferson_address)
        skill_names = [s.name for s in skills]
        # Basic must include zoning + pricing + climate
        assert SkillName.LA_DEVELOPER_INTELLIGENCE in skill_names
        assert SkillName.ENSEMBLE_PRICING_ENGINE in skill_names
        assert SkillName.CLIMATE_ADJUSTED_AVM in skill_names
        # Basic must NOT include institutional skills
        assert SkillName.LLC_VEIL_PIERCING not in skill_names

    def test_institutional_tier_includes_all_core_skills(self, jefferson_address):
        skills = route_skills(tier=ReportTier.INSTITUTIONAL, address=jefferson_address)
        skill_names = [s.name for s in skills]
        assert SkillName.LLC_VEIL_PIERCING in skill_names
        assert SkillName.LA_DEVELOPER_INTELLIGENCE in skill_names
        assert SkillName.DISTRESSED_DEBT_RADAR in skill_names

    def test_skills_sorted_by_priority(self, jefferson_address):
        skills = route_skills(tier=ReportTier.FULL, address=jefferson_address)
        priorities = [s.priority for s in skills]
        assert priorities == sorted(priorities), "Skills must be sorted by priority"

    def test_commercial_activates_tenant_skills(self, jefferson_address):
        skills = route_skills(
            tier=ReportTier.FULL,
            address=jefferson_address,
            is_commercial=True,
        )
        skill_names = [s.name for s in skills]
        assert SkillName.TENANT_CREDIT_COLLAPSE in skill_names
        assert SkillName.TENANT_DEMAND_SIGNAL in skill_names

    def test_dc_zone_activates_dc_skills(self, jefferson_address):
        # El Segundo ZIP - known DC zone
        dc_address = PropertyAddress(
            street="123 Test St",
            zip_code="90245",
        )
        skills = route_skills(
            tier=ReportTier.FULL,
            address=dc_address,
            is_data_center_zone=True,
        )
        skill_names = [s.name for s in skills]
        assert SkillName.DATA_CENTER_INTELLIGENCE in skill_names

    def test_cost_estimate_margins(self):
        for tier in ReportTier:
            estimate = estimate_report_cost(tier)
            assert estimate["gross_margin_pct"] > 80, \
                f"{tier.value} margin {estimate['gross_margin_pct']}% too low"

    def test_basic_cheaper_than_full(self):
        basic = estimate_report_cost(ReportTier.BASIC)
        full = estimate_report_cost(ReportTier.FULL)
        assert basic["cost_usd"] < full["cost_usd"]


# ── UNIT: DATA MODELS ─────────────────────────────────────────────────────

class TestDataModels:

    def test_property_address_full_address(self, jefferson_address):
        assert "3612 W Jefferson Blvd" in jefferson_address.full_address
        assert "Los Angeles" in jefferson_address.full_address
        assert "CA" in jefferson_address.full_address

    def test_report_request_generates_uuid(self, jefferson_address):
        r1 = ReportRequest(address=jefferson_address, tier=ReportTier.BASIC)
        r2 = ReportRequest(address=jefferson_address, tier=ReportTier.BASIC)
        assert r1.request_id != r2.request_id

    def test_data_freshness_values(self):
        assert DataFreshness.LIVE == "LIVE"
        assert DataFreshness.UNVERIFIED == "UNVERIFIED"

    def test_deal_score_enum(self):
        assert DealScore.A_PLUS == "A+"
        assert DealScore.F == "F"


# ── UNIT: GEOCODE AGENT ───────────────────────────────────────────────────

class TestGeocodeAgent:

    @pytest.mark.asyncio
    async def test_geocode_populates_parcel_data(self, full_request):
        state: OrchestratorState = {
            "request": full_request,
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
            "start_time": 0.0,
        }
        result = await geocode_agent(state)
        assert result["parcel_data"]["full_address"] != ""
        assert "Los Angeles" in result["parcel_data"]["full_address"]

    @pytest.mark.asyncio
    async def test_geocode_detects_dc_zone(self, full_request):
        full_request.address.zip_code = "90245"  # El Segundo
        state: OrchestratorState = {
            "request": full_request,
            "parcel_data": {},
            "is_commercial": False,
            "has_violations": False,
            "is_data_center_zone": False,
            "skill_results": {}, "skill_logs": [],
            "ml_valuation": None, "narrative": {},
            "red_flags": [], "assumptions": [],
            "unverified_items": [], "deal_score": None,
            "overall_confidence": 0.0, "errors": [], "start_time": 0.0,
        }
        result = await geocode_agent(state)
        assert result["is_data_center_zone"] is True


# ── UNIT: QUALITY GATE ────────────────────────────────────────────────────

class TestQualityGate:

    @pytest.mark.asyncio
    async def test_quality_gate_flags_low_confidence(self):
        state: OrchestratorState = {
            "request": MagicMock(),
            "parcel_data": {},
            "is_commercial": False, "has_violations": False,
            "is_data_center_zone": False,
            "skill_results": {}, "skill_logs": [],
            "ml_valuation": None,
            "narrative": {
                "executive_summary": "Test summary",
                "strategic_recommendations": ["Action 1"],
            },
            "red_flags": [],
            "assumptions": [], "unverified_items": [],
            "deal_score": DealScore.C,
            "overall_confidence": 30.0,  # Below threshold
            "errors": [], "start_time": 0.0,
        }
        result = await quality_gate_agent(state)
        assert any("LOW CONFIDENCE" in flag for flag in result["red_flags"])

    @pytest.mark.asyncio
    async def test_quality_gate_passes_valid_state(self):
        from core.models import SkillActivationLog
        state: OrchestratorState = {
            "request": MagicMock(),
            "parcel_data": {},
            "is_commercial": False, "has_violations": False,
            "is_data_center_zone": False,
            "skill_results": {},
            "skill_logs": [
                SkillActivationLog(
                    skill_name="la-developer-intelligence",
                    activated=True, confidence=85.0,
                    data_freshness=DataFreshness.UNVERIFIED,
                )
            ],
            "ml_valuation": None,
            "narrative": {
                "executive_summary": "Full summary here",
                "strategic_recommendations": ["Do X", "Do Y"],
            },
            "red_flags": [],
            "assumptions": [], "unverified_items": [],
            "deal_score": DealScore.B,
            "overall_confidence": 78.0,
            "errors": [], "start_time": 0.0,
        }
        result = await quality_gate_agent(state)
        # No new red flags added for valid state
        critical_flags = [f for f in result["red_flags"] if "CRITICAL" in f]
        assert len(critical_flags) == 0


# ── INTEGRATION: FULL REPORT ───────────────────────────────────────────────

class TestOrchestratorIntegration:

    @pytest.mark.asyncio
    async def test_full_report_generation_mock(self, full_request):
        """
        Integration test with mocked Claude API.
        Tests full pipeline: geocode → skills → narrative → quality → assemble
        """
        mock_skill_response = {
            "zoning_code": {"value": "LACM", "confidence": 75.0, "freshness": "UNVERIFIED"},
            "permitted_uses": {"value": "Commercial/Residential", "confidence": 75.0, "freshness": "UNVERIFIED"},
            "max_far": {"value": 3.0, "confidence": 60.0, "freshness": "UNVERIFIED"},
            "height_limit_ft": {"value": 45, "confidence": 60.0, "freshness": "UNVERIFIED"},
            "toc_tier": {"value": "Tier 2", "confidence": 55.0, "freshness": "UNVERIFIED"},
            "ed1_eligible": {"value": True, "confidence": 70.0, "freshness": "UNVERIFIED"},
            "ab2011_eligible": {"value": True, "confidence": 70.0, "freshness": "UNVERIFIED"},
            "rso_covered": {"value": True, "confidence": 85.0, "freshness": "UNVERIFIED"},
            "ladbs_violations": {"value": "Case #1074040 active", "confidence": 90.0, "freshness": "UNVERIFIED"},
            "buildable_sf": {"value": 15660, "confidence": 60.0, "freshness": "UNVERIFIED"},
            "max_units_by_right": {"value": 6, "confidence": 55.0, "freshness": "UNVERIFIED"},
            "max_units_toc": {"value": 10, "confidence": 55.0, "freshness": "UNVERIFIED"},
            "confidence_overall": 72.0,
            "assumptions": ["FAR assumed at 3.0", "TOC tier based on transit proximity"],
            "unverified_items": ["Exact lot size", "Current tenants"],
        }

        mock_narrative = {
            "executive_summary": "Property at 3612 W Jefferson Blvd has active LADBS violations and legal unit count discrepancy.",
            "investment_thesis": "[UNVERIFIED] Potential redevelopment play post-litigation recovery.",
            "risk_summary": "DSCR critically below 1.0. Immediate attention required.",
            "strategic_recommendations": ["Win arbitration first", "Cure LADBS order", "Evaluate ED1 path"],
            "red_flags": ["LADBS Substandard Order active", "DSCR below minimum threshold"],
            "deal_score": "D",
            "deal_score_rationale": "Active violations and negative cash flow dominate.",
            "overall_confidence": 72.0,
        }

        mock_content = MagicMock()
        mock_content.text = __import__('json').dumps(mock_skill_response)

        mock_narrative_content = MagicMock()
        mock_narrative_content.text = __import__('json').dumps(mock_narrative)

        call_count = 0

        async def mock_create(**kwargs):
            nonlocal call_count
            call_count += 1
            response = MagicMock()
            if call_count > 5:  # narrative call
                response.content = [mock_narrative_content]
            else:
                response.content = [mock_content]
            return response

        with patch("core.orchestrator.AsyncAnthropic") as mock_anthropic:
            mock_client = AsyncMock()
            mock_client.messages.create = mock_create
            mock_anthropic.return_value = mock_client

            orchestrator = SevenNovaOrchestrator()
            report = await orchestrator.generate_report(full_request)

        assert report.request_id == full_request.request_id
        assert report.deal_score == DealScore.D
        assert report.overall_confidence == 72.0
        assert "LADBS" in " ".join(report.red_flags)
        assert report.disclaimer != ""
        assert report.generation_time_seconds > 0
        assert report.generation_time_seconds < 120  # Must complete in 2 min

    def test_report_always_has_disclaimer(self, full_request):
        """Compliance test: disclaimer must appear on all reports."""
        from core.models import PropertyReport
        report = PropertyReport(
            request_id="test",
            address=full_request.address,
            tier=full_request.tier,
            deal_score=DealScore.C,
            deal_score_rationale="Test",
            overall_confidence=70.0,
            data_freshness_summary=DataFreshness.UNVERIFIED,
        )
        assert "informational purposes only" in report.disclaimer.lower()
        assert "licensed appraisal" in report.disclaimer.lower()
        assert "SevenNova.ai" in report.disclaimer


# ── COMPLIANCE TESTS ──────────────────────────────────────────────────────

class TestCompliance:

    def test_all_models_have_freshness_tags(self):
        """CCPA/compliance: all data must be tagged with freshness."""
        from core.models import DataPoint
        dp = DataPoint(
            value=620000,
            freshness=DataFreshness.UNVERIFIED,
            source="model inference",
            confidence=72.0,
        )
        assert dp.freshness == DataFreshness.UNVERIFIED

    def test_confidence_scores_bounded(self):
        """All confidence scores must be 0–100."""
        from core.models import DataPoint
        with pytest.raises(Exception):
            DataPoint(
                value="test",
                freshness=DataFreshness.LIVE,
                source="test",
                confidence=150.0,  # Out of bounds — must fail
            )
