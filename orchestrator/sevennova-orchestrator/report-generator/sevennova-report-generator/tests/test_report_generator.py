"""
SevenNova Report Generator — Test Suite
Target: >80% coverage

Run: pytest tests/ -v --cov=core --cov=api --cov-report=term-missing
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.report_generator import ReportGenerator


# ── FIXTURES ───────────────────────────────────────────────────────────────

@pytest.fixture
def generator(tmp_path):
    """Report generator with temp output directory."""
    with patch.dict("os.environ", {"REPORT_OUTPUT_DIR": str(tmp_path / "reports")}):
        gen = ReportGenerator()
    return gen


@pytest.fixture
def mock_report():
    """Mock PropertyReport for testing without live API."""
    from datetime import datetime
    from core.models import (
        DataFreshness, DealScore, PropertyAddress,
        PropertyReport, ReportTier, SkillActivationLog,
        ZoningResult, ValuationResult, DistressResult,
        EntitlementResult, ClimateResult, DataPoint,
    )

    def dp(value, conf=75.0):
        return DataPoint(
            value=value, freshness=DataFreshness.UNVERIFIED,
            source="test", confidence=conf,
        )

    address = PropertyAddress(
        street="3612 W Jefferson Blvd",
        city="Los Angeles", state="CA",
        zip_code="90016", apn="5046-001-001",
    )

    return PropertyReport(
        request_id="test-123",
        address=address,
        tier=ReportTier.FULL,
        generated_at=datetime(2026, 5, 4, 12, 0, 0),
        generation_time_seconds=28.5,
        deal_score=DealScore.D,
        deal_score_rationale="Active LADBS violations dominate",
        overall_confidence=72.0,
        data_freshness_summary=DataFreshness.UNVERIFIED,
        executive_summary="Property has active LADBS substandard order and legal unit discrepancy.",
        investment_thesis="[UNVERIFIED] Potential redevelopment play post-litigation.",
        risk_summary="DSCR critically below threshold. Immediate action required.",
        strategic_recommendations=["Win arbitration first", "Cure LADBS order", "Evaluate ED1"],
        red_flags=["LADBS Substandard Order active", "DSCR 0.39 — below minimum 1.25"],
        assumptions=["FAR assumed 3.0", "RSO rents at $1,700/unit"],
        unverified_items=["Exact lot size", "Loan terms", "OZ designation"],
        skills_activated=[
            SkillActivationLog(
                skill_name="la-developer-intelligence",
                activated=True, confidence=75.0,
                data_freshness=DataFreshness.UNVERIFIED, duration_ms=2800,
            ),
            SkillActivationLog(
                skill_name="distressed-debt-radar",
                activated=True, confidence=82.0,
                data_freshness=DataFreshness.UNVERIFIED, duration_ms=2200,
            ),
            SkillActivationLog(
                skill_name="ensemble-pricing-engine",
                activated=True, confidence=70.0,
                data_freshness=DataFreshness.UNVERIFIED, duration_ms=1800,
            ),
        ],
        zoning=ZoningResult(
            zoning_code=dp("LACM", 80),
            permitted_uses=dp("Commercial/Residential"),
            max_far=dp(3.0, 60),
            height_limit_ft=dp(45, 60),
            toc_tier=dp("Tier 2", 55),
            ed1_eligible=dp(True, 70),
            ab2011_eligible=dp(True, 70),
            rso_covered=dp(True, 85),
            ladbs_violations=dp("Case #1074040 active", 90),
            buildable_sf=dp(15660, 60),
            max_units_by_right=dp(6, 55),
            max_units_toc=dp(10, 55),
            confidence_overall=72.0,
        ),
        valuation=ValuationResult(
            legal_value=dp(620000, 75),
            climate_adjusted_value=dp(571000, 72),
            xgboost_estimate=dp(630000, 70),
            lightgbm_estimate=dp(615000, 70),
            catboost_estimate=dp(625000, 70),
            ensemble_estimate=dp(623000, 75),
            cap_rate=dp(0.061, 65),
            price_per_unit=dp(207667, 65),
            diminution_estimate=dp(1077000, 72),
            confidence_overall=72.0,
        ),
        distress=DistressResult(
            distress_score=dp(78, 80),
            dscr_estimate=dp(0.39, 75),
            loan_maturity_risk=dp("LOW — recent acquisition", 60),
            ladbs_order_active=dp(True, 95),
            entity_stress_signals=dp("Active litigation", 80),
            event_window_months=dp(12, 65),
            confidence_overall=78.0,
        ),
        entitlement=EntitlementResult(
            best_pathway=dp("ED1", 70),
            approval_probability=dp(95.0, 70),
            timeline_months=dp(2, 70),
            irr_impact_pct=dp(-0.3, 65),
            carry_cost_monthly=dp(9917, 60),
            jurisdiction_risk=dp(3, 65),
            confidence_overall=70.0,
        ),
        climate=ClimateResult(
            flood_risk_score=dp(2.5, 85),
            wildfire_risk_score=dp(1.0, 90),
            heat_risk_score=dp(4.0, 80),
            seismic_risk_score=dp(3.5, 75),
            insurance_stress_score=dp(3.0, 75),
            climate_haircut_pct=dp(7.5, 72),
            confidence_overall=82.0,
        ),
    )


# ── UNIT: HTML RENDERING ──────────────────────────────────────────────────

class TestHTMLRendering:

    def test_render_html_returns_string(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert isinstance(html, str)
        assert len(html) > 1000

    def test_html_contains_address(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "3612 W Jefferson Blvd" in html

    def test_html_contains_deal_score(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "D" in html  # Deal score

    def test_html_contains_disclaimer(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "informational purposes only" in html.lower()
        assert "SevenNova.ai" in html

    def test_html_contains_red_flags(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "LADBS Substandard Order active" in html

    def test_html_contains_recommendations(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "Win arbitration first" in html

    def test_html_contains_zoning(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "LACM" in html

    def test_html_contains_valuation(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "620,000" in html  # Legal value

    def test_html_contains_distress_score(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert "78" in html  # Distress score

    def test_html_is_valid_structure(self, generator, mock_report):
        html = generator._render_html(mock_report)
        assert html.startswith("<!DOCTYPE html>")
        assert "</html>" in html
        assert "<body>" in html
        assert "</body>" in html

    def test_error_html_renders(self, generator):
        html = generator._render_error_html("Test Address", "Test error")
        assert "Report Generation Failed" in html
        assert "Test Address" in html
        assert "Test error" in html
        assert "SevenNova.ai" in html


# ── UNIT: FILE OPERATIONS ─────────────────────────────────────────────────

class TestFileOperations:

    def test_save_report_creates_file(self, generator, mock_report, tmp_path):
        html = generator._render_html(mock_report)
        with patch.dict("os.environ", {"REPORT_OUTPUT_DIR": str(tmp_path / "reports")}):
            from core.report_generator import REPORTS_OUTPUT_DIR
        file_path = generator._save_report("test-123", html)
        assert file_path.exists()
        assert file_path.name == "report_test-123.html"

    def test_get_saved_report_returns_html(self, generator, mock_report):
        html = generator._render_html(mock_report)
        generator._save_report("test-456", html)
        retrieved = generator.get_saved_report("test-456")
        assert retrieved is not None
        assert "SevenNova.ai" in retrieved

    def test_get_missing_report_returns_none(self, generator):
        result = generator.get_saved_report("nonexistent-id")
        assert result is None

    def test_list_saved_reports(self, generator, mock_report):
        html = generator._render_html(mock_report)
        generator._save_report("list-test-1", html)
        generator._save_report("list-test-2", html)
        reports = generator.list_saved_reports()
        ids = [r["request_id"] for r in reports]
        assert "list-test-1" in ids
        assert "list-test-2" in ids

    def test_list_reports_sorted_by_date(self, generator, mock_report):
        html = generator._render_html(mock_report)
        generator._save_report("sort-test-a", html)
        generator._save_report("sort-test-b", html)
        reports = generator.list_saved_reports()
        assert len(reports) >= 2
        # Most recent first
        times = [r["created_at"] for r in reports]
        assert times == sorted(times, reverse=True)


# ── INTEGRATION: FULL PIPELINE ────────────────────────────────────────────

class TestFullPipeline:

    @pytest.mark.asyncio
    async def test_generate_returns_success_with_mock(self, generator, mock_report):
        """Full pipeline test with mocked orchestrator."""
        with patch("core.report_generator.SevenNovaOrchestrator") as MockOrch:
            mock_instance = AsyncMock()
            mock_instance.generate_report.return_value = mock_report
            MockOrch.return_value = mock_instance

            result = await generator.generate(
                address="3612 W Jefferson Blvd",
                zip_code="90016",
                tier="full",
            )

        assert result["success"] is True
        assert result["request_id"] is not None
        assert result["html"] is not None
        assert "3612 W Jefferson Blvd" in result["html"]
        assert result["generation_time_seconds"] > 0
        assert result["error"] is None

    @pytest.mark.asyncio
    async def test_generate_handles_error_gracefully(self, generator):
        """Generator must never raise — always return result dict."""
        with patch("core.report_generator.SevenNovaOrchestrator") as MockOrch:
            mock_instance = AsyncMock()
            mock_instance.generate_report.side_effect = Exception("API timeout")
            MockOrch.return_value = mock_instance

            result = await generator.generate(
                address="Invalid Address",
                tier="full",
            )

        assert result["success"] is False
        assert result["error"] == "API timeout"
        assert "SevenNova.ai" in result["html"]  # Error page has branding
        assert result["html"] is not None  # Always returns HTML

    @pytest.mark.asyncio
    async def test_generate_saves_file_when_requested(self, generator, mock_report, tmp_path):
        """Report must be saved to disk when save_to_disk=True."""
        with patch("core.report_generator.SevenNovaOrchestrator") as MockOrch:
            mock_instance = AsyncMock()
            mock_instance.generate_report.return_value = mock_report
            MockOrch.return_value = mock_instance

            result = await generator.generate(
                address="3612 W Jefferson Blvd",
                tier="full",
                save_to_disk=True,
            )

        assert result["file_path"] is not None
        assert Path(result["file_path"]).exists()

    @pytest.mark.asyncio
    async def test_generate_html_under_60_seconds(self, generator, mock_report):
        """Latency test — must complete in under 60 seconds."""
        with patch("core.report_generator.SevenNovaOrchestrator") as MockOrch:
            mock_instance = AsyncMock()
            mock_instance.generate_report.return_value = mock_report
            MockOrch.return_value = mock_instance

            result = await generator.generate(
                address="3612 W Jefferson Blvd",
                tier="full",
            )

        assert result["generation_time_seconds"] < 60.0, \
            f"Report took {result['generation_time_seconds']}s — must be < 60s"

    @pytest.mark.asyncio
    async def test_disclaimer_always_present(self, generator, mock_report):
        """Compliance: disclaimer must appear on every report."""
        with patch("core.report_generator.SevenNovaOrchestrator") as MockOrch:
            mock_instance = AsyncMock()
            mock_instance.generate_report.return_value = mock_report
            MockOrch.return_value = mock_instance

            result = await generator.generate(
                address="3612 W Jefferson Blvd",
                tier="basic",
            )

        assert "informational purposes only" in result["html"].lower()
        assert "licensed appraisal" in result["html"].lower()


# ── API ROUTES ────────────────────────────────────────────────────────────

class TestAPIRoutes:

    @pytest.mark.asyncio
    async def test_html_report_endpoint(self, mock_report):
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from api.report_routes import router

        app = FastAPI()
        app.include_router(router)

        with patch("api.report_routes.ReportGenerator") as MockGen:
            mock_gen = MagicMock()
            mock_gen.generate = AsyncMock(return_value={
                "request_id": "test-789",
                "html": "<html><body>Test Report</body></html>",
                "report": mock_report,
                "file_path": None,
                "generation_time_seconds": 25.0,
                "success": True,
                "error": None,
            })
            MockGen.return_value = mock_gen

            with patch("api.report_routes.get_generator", return_value=mock_gen):
                client = TestClient(app)
                response = client.post(
                    "/api/v1/report/html",
                    json={"street": "3612 W Jefferson Blvd", "tier": "full"},
                )

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
