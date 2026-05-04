"""
SevenNova Stripe — API Routes
Add these to the existing api/main.py FastAPI app.

New endpoints:
  POST /api/v1/webhook/stripe       — Stripe webhook receiver
  POST /api/v1/checkout/session     — Create Stripe Checkout session
  GET  /api/v1/checkout/success     — Post-payment success page
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

import structlog
from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from core.stripe_handler import (
    build_checkout_metadata,
    parse_checkout_session,
    parse_payment_intent,
    send_report_email,
    verify_stripe_signature,
    STRIPE_WEBHOOK_SECRET,
)

log = structlog.get_logger()
router = APIRouter(prefix="/api/v1", tags=["stripe"])

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")

# Tier → Stripe price ID mapping (set in env)
TIER_PRICE_MAP = {
    "basic":         os.getenv("STRIPE_PRICE_BASIC", ""),
    "full":          os.getenv("STRIPE_PRICE_FULL", ""),
    "institutional": os.getenv("STRIPE_PRICE_INSTITUTIONAL", ""),
}


# ── WEBHOOK ────────────────────────────────────────────────────────────────

@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="stripe-signature"),
):
    """
    Receive and process Stripe webhooks.
    
    [SECURITY] Verifies signature before processing any payload.
    
    Supported events:
      - payment_intent.succeeded → trigger report generation
      - checkout.session.completed → trigger report generation
    """
    payload = await request.body()

    # Verify signature
    if STRIPE_WEBHOOK_SECRET:
        if not stripe_signature:
            log.warning("stripe_webhook_missing_signature")
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")

        if not verify_stripe_signature(payload, stripe_signature, STRIPE_WEBHOOK_SECRET):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        log.warning("stripe_webhook_secret_not_set_skipping_verification")

    # Parse event
    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type")
    log.info("stripe_webhook_received", event_type=event_type)

    # Route event
    if event_type == "payment_intent.succeeded":
        report_data = parse_payment_intent(event)
        if report_data:
            asyncio.create_task(_process_report_request(report_data))

    elif event_type == "checkout.session.completed":
        report_data = parse_checkout_session(event)
        if report_data:
            asyncio.create_task(_process_report_request(report_data))

    elif event_type in ("payment_intent.payment_failed", "charge.dispute.created"):
        log.warning("stripe_payment_issue", event_type=event_type)

    # Always return 200 to Stripe — even if we have errors processing
    # Returning non-200 causes Stripe to retry
    return {"received": True, "event_type": event_type}


async def _process_report_request(report_data: dict) -> None:
    """
    Background task: generate report and email to customer.
    Runs asynchronously after webhook returns 200 to Stripe.
    """
    try:
        from core.report_generator import ReportGenerator

        generator = ReportGenerator()
        result = await generator.generate(
            address=report_data["address_street"],
            city=report_data.get("address_city", "Los Angeles"),
            state=report_data.get("address_state", "CA"),
            zip_code=report_data.get("address_zip"),
            apn=report_data.get("address_apn"),
            tier=report_data.get("tier", "full"),
            requester_email=report_data.get("email"),
            save_to_disk=True,
        )

        log.info(
            "webhook_report_generated",
            request_id=result.get("request_id"),
            success=result.get("success"),
            address=report_data["address_street"],
        )

        # Email report to customer
        if result["success"] and report_data.get("email"):
            send_report_email(
                to_email=report_data["email"],
                customer_name=report_data.get("customer_name", "Valued Client"),
                address=report_data["address_street"],
                tier=report_data.get("tier", "full"),
                html_report=result["html"],
                request_id=result["request_id"],
            )

    except Exception as e:
        log.error(
            "webhook_report_failed",
            error=str(e),
            address=report_data.get("address_street"),
        )


# ── CHECKOUT SESSION CREATOR ───────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    address_street: str
    address_city: str = "Los Angeles"
    address_state: str = "CA"
    address_zip: Optional[str] = None
    address_apn: Optional[str] = None
    tier: str = "full"
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    success_url: str = "https://sevennova.ai/success?session_id={CHECKOUT_SESSION_ID}"
    cancel_url: str = "https://sevennova.ai/#pricing"


@router.post("/checkout/session")
async def create_checkout_session(body: CheckoutRequest):
    """
    Create a Stripe Checkout session for report purchase.
    Returns Stripe checkout URL — redirect customer to this URL.

    Requires stripe Python package and STRIPE_SECRET_KEY env var.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Stripe not configured"
        )

    price_id = TIER_PRICE_MAP.get(body.tier)
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"No price configured for tier: {body.tier}"
        )

    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY

        metadata = build_checkout_metadata(
            address_street=body.address_street,
            tier=body.tier,
            email=body.customer_email,
            address_city=body.address_city,
            address_state=body.address_state,
            address_zip=body.address_zip,
            address_apn=body.address_apn,
            customer_name=body.customer_name,
        )

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": price_id, "quantity": 1}],
            metadata=metadata,
            customer_email=body.customer_email,
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            payment_intent_data={"metadata": metadata},
        )

        log.info(
            "checkout_session_created",
            session_id=session.id,
            tier=body.tier,
            address=body.address_street,
        )

        return {
            "checkout_url": session.url,
            "session_id": session.id,
            "tier": body.tier,
            "address": body.address_street,
        }

    except Exception as e:
        log.error("checkout_session_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ── SUCCESS PAGE ───────────────────────────────────────────────────────────

@router.get("/checkout/success", response_class=HTMLResponse)
async def checkout_success(session_id: str = ""):
    """Post-payment success page shown to customer."""
    return HTMLResponse(content=f"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SevenNova.ai — Report Processing</title>
<style>
body {{ background: #04080f; color: #e8f0fe; font-family: Arial, sans-serif;
  display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
.card {{ background: #0c1422; border: 1px solid #162035; border-radius: 16px;
  padding: 48px; max-width: 480px; text-align: center; }}
.icon {{ font-size: 48px; margin-bottom: 16px; }}
h1 {{ font-size: 24px; font-weight: 700; color: #00e5a0; margin-bottom: 8px; }}
p {{ color: #5a7090; font-size: 14px; line-height: 1.6; margin: 8px 0; }}
.session {{ font-family: monospace; font-size: 11px; color: #334155; margin-top: 16px; }}
.disclaimer {{ font-size: 11px; color: #334155; margin-top: 24px; }}
</style>
</head>
<body>
<div class="card">
  <div class="icon">✓</div>
  <h1>Payment Successful</h1>
  <p>Your SevenNova.ai property intelligence report is being generated.</p>
  <p>You'll receive it by email within <strong style="color:#00d4ff">60 seconds</strong>.</p>
  <p>Check your spam folder if you don't see it within 5 minutes.</p>
  <div class="session">Session: {session_id[:20]}...</div>
  <div class="disclaimer">
    For informational purposes only. Not a licensed appraisal.<br>
    © 2026 SevenNova.ai · dan.issak@gmail.com
  </div>
</div>
</body>
</html>
""")
