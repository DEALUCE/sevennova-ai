"""
SevenNova Report Generator — Component 4
Address in → Full HTML report out in < 60 seconds.

Pipeline:
  1. Accept address + tier
  2. Run SevenNovaOrchestrator (all 15 skills)
  3. Inject RAG context
  4. Render Jinja2 HTML template
  5. Return HTML string + save to disk

Usage:
    generator = ReportGenerator()
    html = await generator.generate(address="3612 W Jefferson Blvd", tier="full")
"""
from __future__ import annotations

import asyncio
import os
import time
from pathlib import Path
from typing import Optional

import structlog
from jinja2 import Environment, FileSystemLoader, select_autoescape

log = structlog.get_logger()

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
REPORTS_OUTPUT_DIR = Path(os.getenv("REPORT_OUTPUT_DIR", "./data/reports"))


class ReportGenerator:
    """
    Full-stack report generator.
    Orchestrates all components into a single address→HTML pipeline.

    Cost: $0.05–$0.22 per report (API costs only)
    Latency target: P50=30s, P95=60s
    """

    def __init__(self):
        # Jinja2 template engine
        self.jinja = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )
        REPORTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        log.info("report_generator_initialized", templates_dir=str(TEMPLATES_DIR))

    async def generate(
        self,
        address: str,
        city: str = "Los Angeles",
        state: str = "CA",
        zip_code: Optional[str] = None,
        apn: Optional[str] = None,
        tier: str = "full",
        requester_email: Optional[str] = None,
        save_to_disk: bool = True,
    ) -> dict:
        """
        Main entry point. Address in → HTML report out.

        Args:
            address: Street address e.g. "3612 W Jefferson Blvd"
            city: City (default: Los Angeles)
            state: State (default: CA)
            zip_code: ZIP code (optional but improves accuracy)
            apn: Assessor Parcel Number (optional)
            tier: "basic" | "full" | "institutional"
            requester_email: For delivery tracking
            save_to_disk: Save HTML file to REPORT_OUTPUT_DIR

        Returns:
            {
              "request_id": str,
              "html": str,
              "report": PropertyReport,
              "file_path": str | None,
              "generation_time_seconds": float,
              "success": bool,
              "error": str | None,
            }

        Raises:
            Never — all errors returned in result dict
        """
        start = time.time()

        try:
            # Import here to avoid circular imports
            from core.models import PropertyAddress, ReportRequest, ReportTier
            from core.orchestrator import SevenNovaOrchestrator

            # Build request
            property_address = PropertyAddress(
                street=address,
                city=city,
                state=state,
                zip_code=zip_code,
                apn=apn,
            )
            request = ReportRequest(
                address=property_address,
                tier=ReportTier(tier),
                requester_email=requester_email,
            )

            log.info(
                "report_generation_start",
                address=property_address.full_address,
                tier=tier,
                request_id=request.request_id,
            )

            # Run orchestrator
            orchestrator = SevenNovaOrchestrator()
            report = await orchestrator.generate_report(request)

            # Render HTML
            html = self._render_html(report)

            # Save to disk
            file_path = None
            if save_to_disk:
                file_path = self._save_report(report.request_id, html)

            elapsed = time.time() - start

            log.info(
                "report_generation_complete",
                request_id=report.request_id,
                deal_score=report.deal_score.value,
                elapsed_s=round(elapsed, 2),
                html_size_kb=round(len(html) / 1024, 1),
            )

            return {
                "request_id": report.request_id,
                "html": html,
                "report": report,
                "file_path": str(file_path) if file_path else None,
                "generation_time_seconds": round(elapsed, 2),
                "success": True,
                "error": None,
            }

        except Exception as e:
            elapsed = time.time() - start
            log.error("report_generation_failed", error=str(e), elapsed_s=round(elapsed, 2))
            return {
                "request_id": None,
                "html": self._render_error_html(address, str(e)),
                "report": None,
                "file_path": None,
                "generation_time_seconds": round(elapsed, 2),
                "success": False,
                "error": str(e),
            }

    def _render_html(self, report) -> str:
        """Render the Jinja2 HTML template with report data."""
        template = self.jinja.get_template("report.html")
        return template.render(report=report)

    def _render_error_html(self, address: str, error: str) -> str:
        """Fallback error page when report generation fails."""
        return f"""
<!DOCTYPE html>
<html>
<head><title>SevenNova.ai — Report Error</title>
<style>body{{background:#04080f;color:#e8f0fe;font-family:Arial;padding:40px;}}
.error{{background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.3);
border-left:4px solid #ff4757;border-radius:8px;padding:24px;max-width:600px;margin:40px auto;}}</style>
</head>
<body>
<div class="error">
<h2 style="color:#ff4757;margin-bottom:12px;">⚠ Report Generation Failed</h2>
<p><strong>Address:</strong> {address}</p>
<p style="margin-top:8px;color:#94a3b8;font-size:13px;">{error}</p>
<p style="margin-top:16px;font-size:12px;color:#5a7090;">
For informational purposes only. Not a licensed appraisal. © 2026 SevenNova.ai
</p>
</div>
</body>
</html>
"""

    def _save_report(self, request_id: str, html: str) -> Path:
        """Save HTML report to disk."""
        file_path = REPORTS_OUTPUT_DIR / f"report_{request_id}.html"
        file_path.write_text(html, encoding="utf-8")
        log.info("report_saved", file_path=str(file_path), size_kb=round(len(html) / 1024, 1))
        return file_path

    def get_saved_report(self, request_id: str) -> Optional[str]:
        """Retrieve a previously saved report by request ID."""
        file_path = REPORTS_OUTPUT_DIR / f"report_{request_id}.html"
        if file_path.exists():
            return file_path.read_text(encoding="utf-8")
        return None

    def list_saved_reports(self) -> list[dict]:
        """List all saved reports with metadata."""
        reports = []
        for f in REPORTS_OUTPUT_DIR.glob("report_*.html"):
            stat = f.stat()
            request_id = f.stem.replace("report_", "")
            reports.append({
                "request_id": request_id,
                "file_path": str(f),
                "size_kb": round(stat.st_size / 1024, 1),
                "created_at": stat.st_ctime,
            })
        return sorted(reports, key=lambda r: r["created_at"], reverse=True)
