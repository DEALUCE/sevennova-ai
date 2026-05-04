# SevenNova Stripe Webhook — Component 5

**Payment → auto-trigger report generation → email delivery.**

## What This Does
1. Customer pays on sevennova.ai ($49/$199/$499)
2. Stripe fires `payment_intent.succeeded` webhook
3. Signature verified (HMAC-SHA256, replay attack prevention)
4. Address + tier extracted from payment metadata
5. Report generated automatically in background
6. HTML report emailed to customer within 60 seconds

## Files
| File | Purpose |
|------|---------|
| `core/stripe_handler.py` | Signature verification, event parsing, email |
| `api/stripe_routes.py` | FastAPI routes — webhook + checkout session |
| `tests/test_stripe.py` | Test suite |
| `.env.stripe.example` | Required env vars |

## Setup (4 steps)

### 1. Create Stripe products
- Go to dashboard.stripe.com → Products
- Create: Basic ($49), Full ($199), Institutional ($499)
- Copy Price IDs to .env

### 2. Configure webhook
- Stripe Dashboard → Webhooks → Add endpoint
- URL: `https://sevennova.ai/api/v1/webhook/stripe`
- Events: `payment_intent.succeeded`, `checkout.session.completed`
- Copy signing secret to .env as `STRIPE_WEBHOOK_SECRET`

### 3. Add env vars to .env
See `.env.stripe.example` for all required variables.

### 4. Add routes to main.py
```python
from api.stripe_routes import router as stripe_router
app.include_router(stripe_router)
```

## Add to Stripe Checkout (frontend)
When creating a checkout session, pass metadata:
```javascript
const session = await stripe.checkout.sessions.create({
  metadata: {
    address_street: "3612 W Jefferson Blvd",
    address_city: "Los Angeles",
    address_zip: "90016",
    tier: "full",
    email: customerEmail,
  }
})
```

## Security
- HMAC-SHA256 signature verification on every webhook
- Replay attack prevention (reject events >5 minutes old)
- Constant-time comparison (hmac.compare_digest)
- Credentials from env vars only — never hardcoded
- Email content never logged

## Run Tests
```bash
pytest tests/test_stripe.py -v --cov=core --cov=api --cov-report=term-missing
```

## Disclaimer
For informational purposes only. Not a licensed appraisal.
© 2026 SevenNova.ai
