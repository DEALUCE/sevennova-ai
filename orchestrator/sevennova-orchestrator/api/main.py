"""
SevenNova Orchestrator — FastAPI Application
HTTP API for report generation, health checks, and Stripe webhooks.

Endpoints:
  POST /api/v1/report          — generate report
  GET  /api/v1/report/{id}     — get report status/result
  POST /api/v1/webhook/stripe  — Stripe payment webhook
  GET  /health                 — health check
  GET  /metrics                — Prometheus metrics
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator

from core.models import PropertyAddress, ReportRequest, ReportTier
from core.orchestrator import SevenNovaOrchestrator

log = structlog.get_logger()

# ── REPORT CACHE (in-memory for MVP, replace with Redis at scale) ──────────
_report_cache: dict[str, Any] = {}
_orchestrator: SevenNovaOrchestrator | None = None


# ── LIFESPAN ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize orchestrator on startup."""
    global _orchestrator
    log.info("sevennova_api_starting")
    _orchestrator = SevenNovaOrchestrator()
    log.info("sevennova_api_ready")
    yield
    log.info("sevennova_api_shutdown")


# ── APP ────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SevenNova.ai Orchestrator API",
    description="AI-powered real estate intelligence — 15 engines, one report",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow sevennova.ai frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "https://sevennova.ai").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# ── REQUEST / RESPONSE SCHEMAS ────────────────────────────────────────────

class ReportRequestBody(BaseModel):
    street: str
    city: str = "Los Angeles"
    state: str = "CA"
    zip_code: str | None = None
    apn: str | None = None
    tier: ReportTier = ReportTier.FULL
    requester_email: str | None = None
    requester_name: str | None = None
    notes: str | None = None


class ReportResponse(BaseModel):
    request_id: str
    status: str
    message: str
    report: dict | None = None
    error: str | None = None


# ── ENDPOINTS ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check for Cloudflare and monitoring."""
    return {
        "status": "ok",
        "service": "sevennova-orchestrator",
        "version": "1.0.0",
        "orchestrator_ready": _orchestrator is not None,
        "timestamp": int(time.time()),
    }


@app.post("/api/v1/report", response_model=ReportResponse)
async def generate_report(body: ReportRequestBody):
    """
    Generate a SevenNova property intelligence report.

    Args:
        body: Property address and report tier

    Returns:
        Full PropertyReport as JSON

    Cost: $0.05–$0.20 per request
    Latency target: P50=30s, P95=60s
    """
    if not _orchestrator:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Orchestrator not initialized"
        )

    request = ReportRequest(
        address=PropertyAddress(
            street=body.street,
            city=body.city,
            state=body.state,
            zip_code=body.zip_code,
            apn=body.apn,
        ),
        tier=body.tier,
        requester_email=body.requester_email,
        requester_name=body.requester_name,
        notes=body.notes,
    )

    log.info("api_report_request", request_id=request.request_id, address=request.address.full_address)

    try:
        report = await _orchestrator.generate_report(request)
        report_dict = report.model_dump()
        _report_cache[request.request_id] = report_dict

        return ReportResponse(
            request_id=request.request_id,
            status="complete",
            message=f"Report generated in {report.generation_time_seconds}s",
            report=report_dict,
        )

    except Exception as e:
        log.error("api_report_error", error=str(e), request_id=request.request_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
        )


@app.get("/api/v1/report/{request_id}", response_model=ReportResponse)
async def get_report(request_id: str):
    """Retrieve a previously generated report by ID."""
    report = _report_cache.get(request_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report {request_id} not found"
        )
    return ReportResponse(
        request_id=request_id,
        status="complete",
        message="Report retrieved from cache",
        report=report,
    )


@app.post("/api/v1/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
):
    """
    Stripe webhook — triggers report generation on successful payment.
    Validates Stripe signature before processing.
    [SECURITY] OWASP: Verify webhook signatures — never trust raw payload.
    """
    payload = await request.body()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # Validate Stripe signature
    if webhook_secret and stripe_signature:
        try:
            _verify_stripe_signature(payload, stripe_signature, webhook_secret)
        except ValueError as e:
            log.warning("stripe_signature_invalid", error=str(e))
            raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    event = json.loads(payload)
    event_type = event.get("type")

    log.info("stripe_webhook_received", event_type=event_type)

    if event_type == "payment_intent.succeeded":
        # Extract metadata from Stripe payment
        metadata = event.get("data", {}).get("object", {}).get("metadata", {})
        address_street = metadata.get("address_street")
        address_zip = metadata.get("address_zip")
        tier_str = metadata.get("tier", "full")
        email = metadata.get("email")

        if address_street and _orchestrator:
            # Trigger async report generation
            import asyncio
            asyncio.create_task(
                _orchestrator.generate_report(
                    ReportRequest(
                        address=PropertyAddress(
                            street=address_street,
                            zip_code=address_zip,
                        ),
                        tier=ReportTier(tier_str),
                        requester_email=email,
                    )
                )
            )
            log.info("stripe_report_triggered", address=address_street, email=email)

    return {"received": True}


def _verify_stripe_signature(payload: bytes, signature: str, secret: str) -> None:
    """Verify Stripe webhook signature using HMAC-SHA256."""
    parts = dict(item.split("=", 1) for item in signature.split(",") if "=" in item)
    timestamp = parts.get("t", "")
    sig = parts.get("v1", "")

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise ValueError("Signature mismatch")


# ── ERROR HANDLERS ─────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )
