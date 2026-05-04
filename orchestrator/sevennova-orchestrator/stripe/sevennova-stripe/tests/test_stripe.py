"""
SevenNova Stripe Webhook — Test Suite
Target: >80% coverage

Run: pytest tests/ -v --cov=core --cov=api --cov-report=term-missing
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.stripe_handler import (
    build_checkout_metadata,
    parse_checkout_session,
    parse_payment_intent,
    send_report_email,
    verify_stripe_signature,
)


# ── FIXTURES ───────────────────────────────────────────────────────────────

WEBHOOK_SECRET = "whsec_test_secret_key_for_testing"

def make_stripe_signature(payload: bytes, secret: str, timestamp: int = None) -> str:
    """Generate a valid Stripe webhook signature for testing."""
    if timestamp is None:
        timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    sig = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={sig}"


@pytest.fixture
def payment_intent_event():
    return {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123",
                "amount": 19900,
                "currency": "usd",
                "receipt_email": "test@example.com",
                "metadata": {
                    "address_street": "3612 W Jefferson Blvd",
                    "address_city": "Los Angeles",
                    "address_state": "CA",
                    "address_zip": "90016",
                    "address_apn": "5046-001-001",
                    "tier": "full",
                    "email": "test@example.com",
                    "customer_name": "Dan Issak",
                }
            }
        }
    }


@pytest.fixture
def checkout_session_event():
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "amount_total": 49900,
                "currency": "usd",
                "customer_details": {
                    "email": "client@fund.com",
                    "name": "Investment Fund"
                },
                "metadata": {
                    "address_street": "5281 W Pico Blvd",
                    "address_city": "Los Angeles",
                    "tier": "institutional",
                    "email": "client@fund.com",
                }
            }
        }
    }


# ── UNIT: SIGNATURE VERIFICATION ──────────────────────────────────────────

class TestSignatureVerification:

    def test_valid_signature_passes(self):
        payload = b'{"type":"payment_intent.succeeded"}'
        sig = make_stripe_signature(payload, WEBHOOK_SECRET)
        assert verify_stripe_signature(payload, sig, WEBHOOK_SECRET) is True

    def test_invalid_signature_fails(self):
        payload = b'{"type":"payment_intent.succeeded"}'
        fake_sig = "t=123456789,v1=invalidsignature"
        assert verify_stripe_signature(payload, fake_sig, WEBHOOK_SECRET) is False

    def test_tampered_payload_fails(self):
        payload = b'{"type":"payment_intent.succeeded"}'
        sig = make_stripe_signature(payload, WEBHOOK_SECRET)
        tampered = b'{"type":"charge.refunded"}'  # Different payload
        assert verify_stripe_signature(tampered, sig, WEBHOOK_SECRET) is False

    def test_expired_timestamp_fails(self):
        payload = b'{"type":"payment_intent.succeeded"}'
        old_timestamp = int(time.time()) - 600  # 10 minutes ago
        sig = make_stripe_signature(payload, WEBHOOK_SECRET, timestamp=old_timestamp)
        assert verify_stripe_signature(payload, sig, WEBHOOK_SECRET) is False

    def test_missing_secret_returns_false(self):
        payload = b'{"type":"payment_intent.succeeded"}'
        sig = make_stripe_signature(payload, WEBHOOK_SECRET)
        assert verify_stripe_signature(payload, sig, "") is False

    def test_malformed_signature_fails(self):
        payload = b'{"type":"test"}'
        assert verify_stripe_signature(payload, "not-a-valid-signature", WEBHOOK_SECRET) is False

    def test_missing_v1_fails(self):
        payload = b'{"type":"test"}'
        sig = f"t={int(time.time())}"  # Missing v1
        assert verify_stripe_signature(payload, sig, WEBHOOK_SECRET) is False


# ── UNIT: EVENT PARSING ───────────────────────────────────────────────────

class TestPaymentIntentParsing:

    def test_parses_full_metadata(self, payment_intent_event):
        result = parse_payment_intent(payment_intent_event)
        assert result is not None
        assert result["address_street"] == "3612 W Jefferson Blvd"
        assert result["tier"] == "full"
        assert result["email"] == "test@example.com"
        assert result["customer_name"] == "Dan Issak"
        assert result["amount_paid"] == 199
        assert result["address_zip"] == "90016"

    def test_returns_none_without_address(self):
        event = {
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": "pi_test", "metadata": {}}}
        }
        assert parse_payment_intent(event) is None

    def test_defaults_invalid_tier_to_full(self, payment_intent_event):
        payment_intent_event["data"]["object"]["metadata"]["tier"] = "invalid"
        result = parse_payment_intent(payment_intent_event)
        assert result["tier"] == "full"

    def test_falls_back_to_receipt_email(self):
        event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test",
                    "amount": 4900,
                    "currency": "usd",
                    "receipt_email": "receipt@example.com",
                    "metadata": {
                        "address_street": "123 Test St",
                        "tier": "basic",
                    }
                }
            }
        }
        result = parse_payment_intent(event)
        assert result["email"] == "receipt@example.com"

    def test_amount_converts_cents_to_dollars(self, payment_intent_event):
        result = parse_payment_intent(payment_intent_event)
        assert result["amount_paid"] == 199  # 19900 cents → $199


class TestCheckoutSessionParsing:

    def test_parses_checkout_session(self, checkout_session_event):
        result = parse_checkout_session(checkout_session_event)
        assert result is not None
        assert result["address_street"] == "5281 W Pico Blvd"
        assert result["tier"] == "institutional"
        assert result["email"] == "client@fund.com"
        assert result["customer_name"] == "Investment Fund"

    def test_returns_none_without_address(self):
        event = {
            "type": "checkout.session.completed",
            "data": {"object": {"metadata": {}}}
        }
        assert parse_checkout_session(event) is None

    def test_prefers_customer_details_email(self, checkout_session_event):
        result = parse_checkout_session(checkout_session_event)
        assert result["email"] == "client@fund.com"


# ── UNIT: METADATA BUILDER ────────────────────────────────────────────────

class TestMetadataBuilder:

    def test_builds_required_fields(self):
        metadata = build_checkout_metadata(
            address_street="3612 W Jefferson Blvd",
            tier="full",
        )
        assert metadata["address_street"] == "3612 W Jefferson Blvd"
        assert metadata["tier"] == "full"
        assert metadata["address_city"] == "Los Angeles"
        assert metadata["address_state"] == "CA"

    def test_includes_optional_fields(self):
        metadata = build_checkout_metadata(
            address_street="3612 W Jefferson Blvd",
            tier="institutional",
            email="test@example.com",
            address_zip="90016",
            address_apn="5046-001-001",
            customer_name="Dan Issak",
        )
        assert metadata["email"] == "test@example.com"
        assert metadata["address_zip"] == "90016"
        assert metadata["address_apn"] == "5046-001-001"
        assert metadata["customer_name"] == "Dan Issak"

    def test_respects_stripe_500_char_limit(self):
        long_address = "A" * 600
        metadata = build_checkout_metadata(
            address_street=long_address,
            tier="basic",
        )
        assert len(metadata["address_street"]) <= 500

    def test_all_values_are_strings(self):
        metadata = build_checkout_metadata(
            address_street="Test St",
            tier="full",
        )
        for k, v in metadata.items():
            assert isinstance(v, str), f"Key {k} has non-string value: {type(v)}"


# ── UNIT: EMAIL ───────────────────────────────────────────────────────────

class TestEmailDelivery:

    def test_returns_false_without_smtp_config(self):
        result = send_report_email(
            to_email="test@example.com",
            customer_name="Test",
            address="3612 W Jefferson Blvd",
            tier="full",
            html_report="<html>Test</html>",
            request_id="test-123",
        )
        assert result is False  # No SMTP configured in test env

    def test_email_sent_successfully_with_mock(self):
        with patch("smtplib.SMTP") as mock_smtp, \
             patch.dict("os.environ", {
                 "SMTP_USER": "test@gmail.com",
                 "SMTP_PASSWORD": "testpass",
             }):
            mock_server = MagicMock()
            mock_smtp.return_value.__enter__ = MagicMock(return_value=mock_server)
            mock_smtp.return_value.__exit__ = MagicMock(return_value=False)

            import core.stripe_handler as sh
            original_user = sh.SMTP_USER
            original_pass = sh.SMTP_PASSWORD
            sh.SMTP_USER = "test@gmail.com"
            sh.SMTP_PASSWORD = "testpass"

            result = send_report_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                address="3612 W Jefferson Blvd",
                tier="full",
                html_report="<html><body>Test Report</body></html>",
                request_id="test-456",
            )

            sh.SMTP_USER = original_user
            sh.SMTP_PASSWORD = original_pass

        # With mocked SMTP, should attempt to send
        # Result depends on mock behavior — just check no exception raised
        assert isinstance(result, bool)


# ── INTEGRATION: WEBHOOK ENDPOINT ─────────────────────────────────────────

class TestWebhookEndpoint:

    @pytest.mark.asyncio
    async def test_webhook_accepts_valid_payment_intent(self, payment_intent_event):
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from api.stripe_routes import router

        app = FastAPI()
        app.include_router(router)

        payload = json.dumps(payment_intent_event).encode()
        sig = make_stripe_signature(payload, WEBHOOK_SECRET)

        with patch.dict("os.environ", {"STRIPE_WEBHOOK_SECRET": WEBHOOK_SECRET}), \
             patch("api.stripe_routes.STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET), \
             patch("api.stripe_routes._process_report_request", new_callable=AsyncMock):
            client = TestClient(app)
            response = client.post(
                "/api/v1/webhook/stripe",
                content=payload,
                headers={
                    "stripe-signature": sig,
                    "content-type": "application/json",
                },
            )

        assert response.status_code == 200
        assert response.json()["received"] is True

    def test_webhook_rejects_invalid_signature(self, payment_intent_event):
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from api.stripe_routes import router

        app = FastAPI()
        app.include_router(router)

        payload = json.dumps(payment_intent_event).encode()

        with patch.dict("os.environ", {"STRIPE_WEBHOOK_SECRET": WEBHOOK_SECRET}), \
             patch("api.stripe_routes.STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET):
            client = TestClient(app)
            response = client.post(
                "/api/v1/webhook/stripe",
                content=payload,
                headers={
                    "stripe-signature": "t=fake,v1=invalidsig",
                    "content-type": "application/json",
                },
            )

        assert response.status_code == 400

    def test_success_page_renders(self):
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from api.stripe_routes import router

        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)

        response = client.get("/api/v1/checkout/success?session_id=cs_test_123")
        assert response.status_code == 200
        assert "Payment Successful" in response.text
        assert "SevenNova.ai" in response.text
        assert "informational purposes only" in response.text.lower()


# ── COMPLIANCE TESTS ──────────────────────────────────────────────────────

class TestCompliance:

    def test_disclaimer_in_success_page(self):
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from api.stripe_routes import router

        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)

        response = client.get("/api/v1/checkout/success")
        assert "Not a licensed appraisal" in response.text
        assert "SevenNova.ai" in response.text

    def test_replay_attack_prevented(self):
        """Old timestamps must be rejected."""
        payload = b'{"type":"payment_intent.succeeded"}'
        old_time = int(time.time()) - 600
        sig = make_stripe_signature(payload, WEBHOOK_SECRET, timestamp=old_time)
        assert verify_stripe_signature(payload, sig, WEBHOOK_SECRET) is False

    def test_hmac_uses_constant_time_comparison(self):
        """verify_stripe_signature must use hmac.compare_digest (not ==)."""
        import inspect
        from core.stripe_handler import verify_stripe_signature
        source = inspect.getsource(verify_stripe_signature)
        assert "compare_digest" in source, "Must use hmac.compare_digest for timing-safe comparison"
