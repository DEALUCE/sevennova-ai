"""
SevenNova Stripe Webhook — Component 5
Payment → auto-trigger report generation → email delivery.

Flow:
  1. Customer pays on sevennova.ai
  2. Stripe fires payment_intent.succeeded webhook
  3. We verify signature (OWASP — never trust raw payload)
  4. Extract address + tier + email from payment metadata
  5. Trigger async report generation
  6. Email HTML report to customer
  7. Store in report cache

Stripe metadata keys (set these in Stripe Checkout session):
  address_street: "3612 W Jefferson Blvd"
  address_city:   "Los Angeles"
  address_state:  "CA"
  address_zip:    "90016"
  address_apn:    "5046-001-001" (optional)
  tier:           "basic" | "full" | "institutional"
  email:          "customer@example.com"
  customer_name:  "John Smith"
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Optional

import structlog

log = structlog.get_logger()

# ── CONFIG ─────────────────────────────────────────────────────────────────
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "dan.issak@gmail.com")
FROM_NAME = os.getenv("FROM_NAME", "SevenNova.ai")

# Stripe price ID → report tier mapping
# Set these in your Stripe dashboard
PRICE_TIER_MAP = {
    os.getenv("STRIPE_PRICE_BASIC", "price_basic"):           "basic",
    os.getenv("STRIPE_PRICE_FULL", "price_full"):             "full",
    os.getenv("STRIPE_PRICE_INSTITUTIONAL", "price_inst"):    "institutional",
    os.getenv("STRIPE_PRICE_SUB_BROKER", "price_sub_broker"): "full",
    os.getenv("STRIPE_PRICE_SUB_INVESTOR", "price_sub_inv"):  "institutional",
    os.getenv("STRIPE_PRICE_SUB_ENTERPRISE", "price_sub_ent"):"institutional",
}


# ── SIGNATURE VERIFICATION ─────────────────────────────────────────────────

def verify_stripe_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify Stripe webhook signature using HMAC-SHA256.
    [SECURITY] OWASP: Always verify webhook signatures.
    Never process unsigned payloads.

    Returns:
        True if valid, False if invalid

    Reference: https://stripe.com/docs/webhooks/signatures
    """
    if not secret:
        log.warning("stripe_secret_not_configured")
        return False

    try:
        parts = dict(
            item.split("=", 1)
            for item in signature.split(",")
            if "=" in item
        )
        timestamp = parts.get("t", "")
        sig_received = parts.get("v1", "")

        if not timestamp or not sig_received:
            log.warning("stripe_signature_malformed", signature=signature[:50])
            return False

        # Replay attack prevention — reject if >5 minutes old
        event_time = int(timestamp)
        current_time = int(time.time())
        if abs(current_time - event_time) > 300:
            log.warning(
                "stripe_signature_expired",
                event_time=event_time,
                current_time=current_time,
                age_seconds=abs(current_time - event_time),
            )
            return False

        # Compute expected signature
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        expected = hmac.new(
            secret.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        valid = hmac.compare_digest(expected, sig_received)
        if not valid:
            log.warning("stripe_signature_mismatch")
        return valid

    except Exception as e:
        log.error("stripe_signature_error", error=str(e))
        return False


# ── EVENT PARSER ───────────────────────────────────────────────────────────

def parse_payment_intent(event: dict[str, Any]) -> Optional[dict]:
    """
    Extract report request data from Stripe payment_intent.succeeded event.

    Returns:
        Dict with {address, city, state, zip_code, apn, tier, email, name}
        or None if required fields missing
    """
    try:
        obj = event.get("data", {}).get("object", {})
        metadata = obj.get("metadata", {})

        address_street = metadata.get("address_street")
        if not address_street:
            log.warning("stripe_missing_address", metadata=metadata)
            return None

        tier = metadata.get("tier", "full")
        if tier not in ("basic", "full", "institutional"):
            log.warning("stripe_invalid_tier", tier=tier)
            tier = "full"  # Default to full

        return {
            "address_street": address_street,
            "address_city": metadata.get("address_city", "Los Angeles"),
            "address_state": metadata.get("address_state", "CA"),
            "address_zip": metadata.get("address_zip"),
            "address_apn": metadata.get("address_apn"),
            "tier": tier,
            "email": metadata.get("email") or obj.get("receipt_email"),
            "customer_name": metadata.get("customer_name", "Valued Client"),
            "amount_paid": obj.get("amount", 0) // 100,  # cents → dollars
            "payment_intent_id": obj.get("id"),
            "currency": obj.get("currency", "usd").upper(),
        }

    except Exception as e:
        log.error("stripe_parse_error", error=str(e))
        return None


def parse_checkout_session(event: dict[str, Any]) -> Optional[dict]:
    """
    Extract report request data from checkout.session.completed event.
    Alternative to payment_intent if using Stripe Checkout.
    """
    try:
        session = event.get("data", {}).get("object", {})
        metadata = session.get("metadata", {})
        customer_details = session.get("customer_details", {})

        address_street = metadata.get("address_street")
        if not address_street:
            return None

        return {
            "address_street": address_street,
            "address_city": metadata.get("address_city", "Los Angeles"),
            "address_state": metadata.get("address_state", "CA"),
            "address_zip": metadata.get("address_zip"),
            "address_apn": metadata.get("address_apn"),
            "tier": metadata.get("tier", "full"),
            "email": customer_details.get("email") or metadata.get("email"),
            "customer_name": customer_details.get("name", "Valued Client"),
            "amount_paid": session.get("amount_total", 0) // 100,
            "session_id": session.get("id"),
            "currency": session.get("currency", "usd").upper(),
        }

    except Exception as e:
        log.error("checkout_session_parse_error", error=str(e))
        return None


# ── EMAIL DELIVERY ─────────────────────────────────────────────────────────

def send_report_email(
    to_email: str,
    customer_name: str,
    address: str,
    tier: str,
    html_report: str,
    request_id: str,
) -> bool:
    """
    Send HTML report via email to customer.

    [SECURITY] Never log email content — only metadata.
    Uses TLS SMTP. Credentials from env vars, never hardcoded.

    Returns:
        True if sent successfully, False otherwise
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        log.warning("smtp_not_configured", to=to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"SevenNova.ai — Property Intelligence Report: {address}"
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email
        msg["X-Report-ID"] = request_id

        # Plain text fallback
        text_body = f"""
Dear {customer_name},

Your SevenNova.ai property intelligence report is ready.

Property: {address}
Report Tier: {tier.upper()}
Report ID: {request_id}

Please find your full HTML report attached or view it in your browser.

---
For informational purposes only. Not a licensed appraisal.
Consult a licensed professional before making any real estate or financial decision.
© 2026 SevenNova.ai | dan.issak@gmail.com
        """.strip()

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_report, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        log.info(
            "report_email_sent",
            to=to_email,
            request_id=request_id,
            address=address,
            tier=tier,
        )
        return True

    except smtplib.SMTPAuthenticationError:
        log.error("smtp_auth_failed", user=SMTP_USER)
        return False
    except smtplib.SMTPException as e:
        log.error("smtp_error", error=str(e), to=to_email)
        return False
    except Exception as e:
        log.error("email_send_error", error=str(e))
        return False


# ── STRIPE CHECKOUT SESSION BUILDER ───────────────────────────────────────

def build_checkout_metadata(
    address_street: str,
    tier: str,
    email: Optional[str] = None,
    address_city: str = "Los Angeles",
    address_state: str = "CA",
    address_zip: Optional[str] = None,
    address_apn: Optional[str] = None,
    customer_name: Optional[str] = None,
) -> dict[str, str]:
    """
    Build Stripe metadata dict for a Checkout Session.
    Pass this to stripe.checkout.Session.create(metadata=...)

    Keeps all required info to trigger report generation after payment.
    Max 50 keys, 500 chars per value — Stripe limit.
    """
    metadata: dict[str, str] = {
        "address_street": address_street[:500],
        "address_city": address_city,
        "address_state": address_state,
        "tier": tier,
    }
    if email:
        metadata["email"] = email[:500]
    if address_zip:
        metadata["address_zip"] = address_zip
    if address_apn:
        metadata["address_apn"] = address_apn
    if customer_name:
        metadata["customer_name"] = customer_name[:500]

    return metadata
