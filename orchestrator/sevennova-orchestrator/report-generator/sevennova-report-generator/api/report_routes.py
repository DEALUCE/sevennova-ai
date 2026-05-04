"""
SevenNova Report Generator — API Endpoints
Add these routes to the existing api/main.py FastAPI app.

New endpoints:
  POST /api/v1/report/html    — generate + return HTML directly
  GET  /api/v1/report/{id}/html — get saved HTML report
  GET  /api/v1/reports         — list all saved reports
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional

from core.report_generator import ReportGenerator

router = APIRouter(prefix="/api/v1", tags=["reports"])
_generator: ReportGenerator | None = None


def get_generator() -> ReportGenerator:
    global _generator
    if _generator is None:
        _generator = ReportGenerator()
    return _generator


class HTMLReportRequest(BaseModel):
    street: str
    city: str = "Los Angeles"
    state: str = "CA"
    zip_code: Optional[str] = None
    apn: Optional[str] = None
    tier: str = "full"
    requester_email: Optional[str] = None


@router.post("/report/html", response_class=HTMLResponse)
async def generate_html_report(body: HTMLReportRequest):
    """
    Generate and return a full HTML report directly.
    This is the core product endpoint.

    Returns: HTML page — ready to display or save as file.
    Latency: P50=30s, P95=60s
    """
    generator = get_generator()
    result = await generator.generate(
        address=body.street,
        city=body.city,
        state=body.state,
        zip_code=body.zip_code,
        apn=body.apn,
        tier=body.tier,
        requester_email=body.requester_email,
        save_to_disk=True,
    )

    if not result["success"]:
        return HTMLResponse(content=result["html"], status_code=500)

    return HTMLResponse(content=result["html"], status_code=200)


@router.get("/report/{request_id}/html", response_class=HTMLResponse)
async def get_html_report(request_id: str):
    """Retrieve a previously generated HTML report."""
    generator = get_generator()
    html = generator.get_saved_report(request_id)
    if not html:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report {request_id} not found"
        )
    return HTMLResponse(content=html)


@router.get("/reports")
async def list_reports():
    """List all saved reports."""
    generator = get_generator()
    return {"reports": generator.list_saved_reports()}
