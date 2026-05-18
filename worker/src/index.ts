import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { generateReport, type Env } from './orchestrator'
import { renderReportHTML, renderErrorHTML } from './templates'
import { createCheckoutSession, verifyStripeSignature } from './stripe'

const app = new Hono<{ Bindings: Env }>()

// CORS
app.use('*', async (c, next) => {
  const origins = (c.env.CORS_ORIGINS ?? 'https://sevennova.ai,http://localhost:3000').split(',').map(s => s.trim())
  return cors({ origin: origins, allowMethods: ['GET', 'POST', 'OPTIONS'] })(c, next)
})

// ── AUTH ─────────────────────────────────────────────────────────────────────
// Validate X-API-Key against KV namespace SEVENNOVA_KEYS.
// Stripe webhook is exempt — it carries its own HMAC signature.

app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  if (path === '/api/v1/webhook/stripe') return next()

  const key = c.req.header('X-API-Key') ?? ''
  if (!key) return c.json({ error: 'unauthorized' }, 401)

  // KV lookup — value can be anything truthy (e.g. customer email, tier, "1")
  const valid = c.env.SEVENNOVA_KEYS
    ? await c.env.SEVENNOVA_KEYS.get(key)
    : null

  if (!valid) return c.json({ error: 'unauthorized' }, 401)

  return next()
})

// ── ROOT ────────────────────────────────────────────────────────────────────

app.get('/', (c) =>
  c.json({
    service: 'sevennova-orchestrator',
    version: '1.0.0',
    runtime: 'cloudflare-workers',
    endpoints: {
      health:   'GET  /health',
      report:   'POST /api/v1/report',
      html:     'POST /api/v1/report/html',
      checkout: 'POST /api/v1/checkout/session',
      webhook:  'POST /api/v1/webhook/stripe',
    },
  }),
)

// ── HEALTH ─────────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'sevennova-orchestrator',
    version: '1.0.0',
    runtime: 'cloudflare-workers',
    timestamp: Math.floor(Date.now() / 1000),
  }),
)

app.get('/metrics', (c) =>
  c.json({ status: 'ok', note: 'Prometheus metrics not available in Workers runtime' }),
)

// ── REPORT: HTML ───────────────────────────────────────────────────────────

app.post('/api/v1/report/html', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.html(renderErrorHTML('Unknown', 'Invalid JSON request body'), 400)
  }

  const street = String(body.street ?? '')
  if (!street) return c.html(renderErrorHTML('', 'Missing required field: street'), 400)

  if (!c.env.ANTHROPIC_API_KEY && c.env.DEV_MODE !== 'true') {
    return c.html(renderErrorHTML(street, 'ANTHROPIC_API_KEY not configured'), 503)
  }
  if (c.env.DEV_MODE === 'true' && !c.env.OLLAMA_URL) {
    return c.html(renderErrorHTML(street, 'DEV_MODE=true but OLLAMA_URL not configured'), 503)
  }

  try {
    const report = await generateReport(
      street,
      String(body.city ?? 'Los Angeles'),
      String(body.state ?? 'CA'),
      body.zip_code ? String(body.zip_code) : undefined,
      body.apn ? String(body.apn) : undefined,
      String(body.tier ?? 'full'),
      body.requester_email ? String(body.requester_email) : undefined,
      c.env,
    )
    return c.html(renderReportHTML(report))
  } catch (e) {
    return c.html(renderErrorHTML(street, String(e)), 500)
  }
})

// ── REPORT: JSON ───────────────────────────────────────────────────────────

app.post('/api/v1/report', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  const street = String(body.street ?? '')
  if (!street) return c.json({ error: 'Missing required field: street' }, 400)

  if (!c.env.ANTHROPIC_API_KEY && c.env.DEV_MODE !== 'true') {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 503)
  }
  if (c.env.DEV_MODE === 'true' && !c.env.OLLAMA_URL) {
    return c.json({ error: 'DEV_MODE=true but OLLAMA_URL not configured' }, 503)
  }

  try {
    const report = await generateReport(
      street,
      String(body.city ?? 'Los Angeles'),
      String(body.state ?? 'CA'),
      body.zip_code ? String(body.zip_code) : undefined,
      body.apn ? String(body.apn) : undefined,
      String(body.tier ?? 'full'),
      body.requester_email ? String(body.requester_email) : undefined,
      c.env,
    )
    return c.json({
      request_id: report.request_id,
      status: 'complete',
      message: `Report generated in ${report.generation_time_seconds}s`,
      report,
    })
  } catch (e) {
    return c.json({ error: `Report generation failed: ${String(e)}` }, 500)
  }
})

// Report retrieval — no persistent storage in Workers MVP; use KV/D1 to extend
app.get('/api/v1/report/:id', (c) =>
  c.json({ error: `Report ${c.req.param('id')} not found — no persistent storage in Workers MVP` }, 404),
)

app.get('/api/v1/reports', (c) => c.json({ reports: [] }))

// ── CHECKOUT ───────────────────────────────────────────────────────────────

app.post('/api/v1/checkout/session', async (c) => {
  const stripeKey = c.env.STRIPE_SECRET_KEY
  if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 503)

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  try {
    const result = await createCheckoutSession(
      {
        address_street: String(body.address_street ?? ''),
        address_city: body.address_city ? String(body.address_city) : undefined,
        address_state: body.address_state ? String(body.address_state) : undefined,
        address_zip: body.address_zip ? String(body.address_zip) : undefined,
        address_apn: body.address_apn ? String(body.address_apn) : undefined,
        tier: String(body.tier ?? 'full'),
        customer_email: body.customer_email ? String(body.customer_email) : undefined,
        customer_name: body.customer_name ? String(body.customer_name) : undefined,
        success_url: body.success_url ? String(body.success_url) : undefined,
        cancel_url: body.cancel_url ? String(body.cancel_url) : undefined,
      },
      c.env,
    )
    return c.json(result)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ── STRIPE WEBHOOK ─────────────────────────────────────────────────────────

app.post('/api/v1/webhook/stripe', async (c) => {
  const rawBody = await c.req.arrayBuffer()
  const sig = c.req.header('stripe-signature') ?? ''
  const secret = c.env.STRIPE_WEBHOOK_SECRET

  if (secret && sig) {
    const valid = await verifyStripeSignature(rawBody, sig, secret)
    if (!valid) return c.json({ error: 'Invalid webhook signature' }, 400)
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  const eventType = String(event.type ?? '')

  // Fire-and-forget report generation on successful payment
  if (
    (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') &&
    (c.env.ANTHROPIC_API_KEY || c.env.DEV_MODE === 'true')
  ) {
    const obj = (event.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined
    const metadata = (obj?.metadata ?? {}) as Record<string, string>
    const street = metadata.address_street
    if (street) {
      const ctx = c.executionCtx
      ctx.waitUntil(
        generateReport(
          street,
          metadata.address_city ?? 'Los Angeles',
          metadata.address_state ?? 'CA',
          metadata.address_zip || undefined,
          metadata.address_apn || undefined,
          metadata.tier ?? 'full',
          metadata.email || undefined,
          c.env,
        ).catch(() => { /* log error silently */ }),
      )
    }
  }

  return c.json({ received: true, event_type: eventType })
})

export default app
