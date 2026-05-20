import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { generateReport, type Env } from './orchestrator'
import { renderReportHTML, renderErrorHTML } from './templates'
import { createCheckoutSession, verifyStripeSignature } from './stripe'
import { runHealthCheck } from './agents/health-monitor'
import { sendOnboardingEmail } from './agents/onboarding'
import { runCacheInvalidation } from './agents/cache-invalidator'
import { sendEmail } from './agents/resend'
import { generatePDFReport } from './pdf-report'
import { checkRateLimit } from './rate-limit'
import { getAuditRecord } from './audit'
import { fetchMLSComps } from './mls'

const app = new Hono<{ Bindings: Env }>()

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const origins = (c.env.CORS_ORIGINS ?? 'https://sevennova.ai,http://localhost:3000').split(',').map(s => s.trim())
  return cors({ origin: origins, allowMethods: ['GET', 'POST', 'OPTIONS'] })(c, next)
})

// ── ADMIN AUTH MIDDLEWARE ─────────────────────────────────────────────────────
// Phase 4: Admin routes require ADMIN_SECRET header.
// ADMIN_SECRET placeholder — set via: wrangler secret put ADMIN_SECRET

app.use('/admin/*', async (c, next) => {
  const secret = c.env.ADMIN_SECRET
  if (!secret) return c.json({ error: 'Admin API not configured — set ADMIN_SECRET secret' }, 503)
  const provided = c.req.header('X-Admin-Secret') ?? c.req.header('Authorization')?.replace('Bearer ', '')
  if (!provided || provided !== secret) return c.json({ error: 'Forbidden' }, 403)
  return next()
})

// ── USER AUTH MIDDLEWARE ──────────────────────────────────────────────────────
// Validate X-API-Key against KV. Exempt: Stripe webhook, checkout, admin (has own auth).

app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  if (
    path === '/api/v1/webhook/stripe' ||
    path === '/api/v1/checkout/session' ||
    path.startsWith('/api/v1/checkout/') ||
    path.startsWith('/admin/')
  ) return next()

  const key = c.req.header('X-API-Key') ?? ''
  if (!key) return c.json({ error: 'unauthorized' }, 401)

  const valid = c.env.SEVENNOVA_KEYS ? await c.env.SEVENNOVA_KEYS.get(key) : null
  if (!valid) return c.json({ error: 'unauthorized' }, 401)

  return next()
})

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Phase 3: Applied to report endpoints. Reads tier from stored key record.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enforceRateLimit(c: any): Promise<Response | null> {
  const apiKey: string = c.req.header('X-API-Key') ?? ''
  const env: Env = c.env
  if (!apiKey || !env.SEVENNOVA_KEYS) return null

  const keyData = await env.SEVENNOVA_KEYS.get(apiKey)
  let tier = 'full'
  try { tier = JSON.parse(keyData ?? '{}').tier ?? 'full' } catch { /* default */ }

  const rl = await checkRateLimit(env, apiKey, tier)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate_limit_exceeded',
        message: `Daily limit of ${rl.limit} reports reached for ${tier} tier`,
        limit: rl.limit,
        remaining: rl.remaining,
        reset_at: rl.reset_at,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Limit': String(rl.limit), 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.reset_at } },
    )
  }
  return null
}

// ── ROOT ──────────────────────────────────────────────────────────────────────

app.get('/', (c) =>
  c.json({
    service: 'sevennova-orchestrator',
    version: '2.0.0',
    runtime: 'cloudflare-workers',
    endpoints: {
      health:   'GET  /health',
      report:   'POST /api/v1/report',
      html:     'POST /api/v1/report/html',
      pdf:      'POST /api/v1/report/pdf',
      checkout: 'POST /api/v1/checkout/session',
      session:  'GET  /api/v1/checkout/session/:id',
      webhook:  'POST /api/v1/webhook/stripe',
      mls:      'POST /api/v1/mls/comps',
      admin: {
        keys:          'GET  /admin/keys',
        key:           'GET  /admin/keys/:id',
        revoke:        'POST /admin/keys/:id/revoke',
        report:        'GET  /admin/reports/:audit_id',
        review_queue:  'GET  /admin/review-queue',
        review_resolve:'POST /admin/review-queue/:audit_id/resolve',
        usage_export:  'GET  /admin/usage/export',
      },
    },
  }),
)

// ── HEALTH ────────────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'sevennova-orchestrator', version: '2.0.0', runtime: 'cloudflare-workers', timestamp: Math.floor(Date.now() / 1000) }),
)

app.get('/metrics', (c) =>
  c.json({ status: 'ok', note: 'Prometheus metrics not available in Workers runtime' }),
)

// ── REPORT: HTML ──────────────────────────────────────────────────────────────

app.post('/api/v1/report/html', async (c) => {
  const rlResp = await enforceRateLimit(c as never)
  if (rlResp) return rlResp

  let body: Record<string, unknown>
  try { body = await c.req.json() } catch {
    return c.html(renderErrorHTML('Unknown', 'Invalid JSON request body'), 400)
  }

  const street = String(body.street ?? '')
  if (!street) return c.html(renderErrorHTML('', 'Missing required field: street'), 400)

  if (!c.env.ANTHROPIC_API_KEY && c.env.DEV_MODE !== 'true')
    return c.html(renderErrorHTML(street, 'ANTHROPIC_API_KEY not configured'), 503)

  const apiKey = c.req.header('X-API-Key') ?? 'anonymous'
  try {
    const report = await generateReport(
      street, String(body.city ?? 'Los Angeles'), String(body.state ?? 'CA'),
      body.zip_code ? String(body.zip_code) : undefined,
      body.apn ? String(body.apn) : undefined,
      String(body.tier ?? 'full'),
      body.requester_email ? String(body.requester_email) : undefined,
      c.env, apiKey,
    )
    return c.html(renderReportHTML(report))
  } catch (e) {
    await logFailure(c.env, 'report_generation', String(e), street)
    return c.html(renderErrorHTML(street, String(e)), 500)
  }
})

// ── REPORT: JSON ──────────────────────────────────────────────────────────────

app.post('/api/v1/report', async (c) => {
  const rlResp = await enforceRateLimit(c as never)
  if (rlResp) return rlResp

  let body: Record<string, unknown>
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  const street = String(body.street ?? '')
  if (!street) return c.json({ error: 'Missing required field: street' }, 400)

  if (!c.env.ANTHROPIC_API_KEY && c.env.DEV_MODE !== 'true')
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 503)

  const apiKey = c.req.header('X-API-Key') ?? 'anonymous'
  try {
    const report = await generateReport(
      street, String(body.city ?? 'Los Angeles'), String(body.state ?? 'CA'),
      body.zip_code ? String(body.zip_code) : undefined,
      body.apn ? String(body.apn) : undefined,
      String(body.tier ?? 'full'),
      body.requester_email ? String(body.requester_email) : undefined,
      c.env, apiKey,
    )
    return c.json({ request_id: report.request_id, status: 'complete', message: `Report generated in ${report.generation_time_seconds}s`, report })
  } catch (e) {
    await logFailure(c.env, 'report_generation', String(e), street)
    return c.json({ error: `Report generation failed: ${String(e)}` }, 500)
  }
})

// ── REPORT: PDF ───────────────────────────────────────────────────────────────
// Phase 0: Lender-grade PDF using pdf-lib (pure JS, no Node.js streams)

app.post('/api/v1/report/pdf', async (c) => {
  const rlResp = await enforceRateLimit(c as never)
  if (rlResp) return rlResp

  let body: Record<string, unknown>
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }

  const street = String(body.street ?? '')
  if (!street) return c.json({ error: 'Missing required field: street' }, 400)

  if (!c.env.ANTHROPIC_API_KEY && c.env.DEV_MODE !== 'true')
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 503)

  const apiKey = c.req.header('X-API-Key') ?? 'anonymous'
  try {
    const report = await generateReport(
      street, String(body.city ?? 'Los Angeles'), String(body.state ?? 'CA'),
      body.zip_code ? String(body.zip_code) : undefined,
      body.apn ? String(body.apn) : undefined,
      String(body.tier ?? 'full'),
      body.requester_email ? String(body.requester_email) : undefined,
      c.env, apiKey,
    )

    const pdfBytes = await generatePDFReport(report, apiKey, c.env.GOOGLE_MAPS_API_KEY).catch(async (e) => {
      await logFailure(c.env, 'pdf_generation', String(e), street)
      throw e
    })

    const filename = `sevennova-${report.request_id}.pdf`
    return new Response(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-Id': report.request_id,
        'X-Deal-Score': report.deal_score,
        'X-Overall-Confidence': String(report.overall_confidence),
      },
    })
  } catch (e) {
    return c.json({ error: `PDF generation failed: ${String(e)}` }, 500)
  }
})

// ── REPORT RETRIEVAL ──────────────────────────────────────────────────────────

app.get('/api/v1/report/:id', (c) =>
  c.json({ error: `Report ${c.req.param('id')} not found — persistent storage requires D1 upgrade` }, 404),
)

app.get('/api/v1/reports', (c) => c.json({ reports: [] }))

// ── MLS COMPS ─────────────────────────────────────────────────────────────────
// Phase 6: Mock adapter — always returns UNSUPPORTED until data feed is licensed

app.post('/api/v1/mls/comps', async (c) => {
  let body: Record<string, unknown>
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }
  const result = await fetchMLSComps(
    String(body.address ?? ''),
    body.zip_code ? String(body.zip_code) : undefined,
  )
  const statusCode = result.status === 'SUPPORTED' ? 200 : 422
  return c.json(result, statusCode)
})

// ── CHECKOUT ──────────────────────────────────────────────────────────────────

app.post('/api/v1/checkout/session', async (c) => {
  const stripeKey = c.env.STRIPE_SECRET_KEY
  if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 503)

  let body: Record<string, unknown>
  try { body = await c.req.json() } catch {
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
    await logFailure(c.env, 'stripe_checkout', String(e))
    return c.json({ error: String(e) }, 500)
  }
})

// Phase 2: Retrieve API key by Stripe session ID (used by success page)
app.get('/api/v1/checkout/session/:id', async (c) => {
  const sessionId = c.req.param('id')
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'Storage not configured' }, 503)

  const apiKey = await c.env.SEVENNOVA_KEYS.get(`session:${sessionId}`)
  if (!apiKey) return c.json({ error: 'Session not found or expired' }, 404)

  const keyData = await c.env.SEVENNOVA_KEYS.get(apiKey)
  if (!keyData) return c.json({ error: 'API key record not found' }, 404)

  let parsed: Record<string, string> = {}
  try { parsed = JSON.parse(keyData) } catch { /* ignore */ }

  return c.json({ api_key: apiKey, tier: parsed.tier ?? 'unknown', email: parsed.email ?? '' })
})

// ── STRIPE WEBHOOK ─────────────────────────────────────────────────────────────

app.post('/api/v1/webhook/stripe', async (c) => {
  const rawBody = await c.req.arrayBuffer()
  const sig = c.req.header('stripe-signature') ?? ''
  const secret = c.env.STRIPE_WEBHOOK_SECRET

  // Phase 2: Always require signature verification — reject if not configured
  if (!secret) {
    await logFailure(c.env, 'stripe_webhook', 'STRIPE_WEBHOOK_SECRET not configured')
    return c.json({ error: 'Webhook secret not configured' }, 503)
  }

  const valid = await verifyStripeSignature(rawBody, sig, secret)
  if (!valid) {
    await logFailure(c.env, 'stripe_webhook', `Invalid signature — sig: ${sig.slice(0, 20)}`)
    return c.json({ error: 'Invalid webhook signature' }, 400)
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  const eventType = String(event.type ?? '')
  const obj = (event.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined
  const metadata = (obj?.metadata ?? {}) as Record<string, string>

  if (eventType === 'checkout.session.completed') {
    const sessionId = String(obj?.id ?? '')
    const customerEmail = metadata.email ?? (obj?.customer_details as Record<string, string> | undefined)?.email ?? ''
    const tier = metadata.tier ?? 'full'

    // Phase 4: Idempotency — if this session already has a key, return it (webhook replay safe)
    if (sessionId && c.env.SEVENNOVA_KEYS) {
      const existingKey = await c.env.SEVENNOVA_KEYS.get(`session:${sessionId}`)
      if (existingKey) {
        return c.json({ received: true, event_type: eventType, api_key: existingKey, idempotent: true })
      }
    }

    // Generate API key with usage limits
    const apiKey = `key_${crypto.randomUUID().replace(/-/g, '')}`
    const keyRecord = JSON.stringify({
      tier,
      email: customerEmail,
      created: new Date().toISOString(),
      created_date: new Date().toISOString().slice(0, 10),
      session_id: sessionId,
      usage_limit_daily: tier === 'basic' ? 3 : tier === 'institutional' ? 25 : 10,
      status: 'active',
    })

    if (c.env.SEVENNOVA_KEYS) {
      // Store key record
      await c.env.SEVENNOVA_KEYS.put(apiKey, keyRecord).catch(() => {})
      // Phase 2: Store session → api_key mapping (7-day TTL for success page retrieval)
      if (sessionId) {
        await c.env.SEVENNOVA_KEYS.put(`session:${sessionId}`, apiKey, { expirationTtl: 86400 * 7 }).catch(() => {})
      }
    }

    // Agent 2: Onboarding email — fire-and-forget
    if (customerEmail) {
      c.executionCtx.waitUntil(
        sendOnboardingEmail(c.env, apiKey, tier, customerEmail).catch(async (e) => {
          await logFailure(c.env, 'email_onboarding', String(e), customerEmail)
        }),
      )
    }

    // Fire-and-forget report generation
    const street = metadata.address_street
    if (street && (c.env.ANTHROPIC_API_KEY || c.env.DEV_MODE === 'true')) {
      c.executionCtx.waitUntil(
        generateReport(
          street, metadata.address_city ?? 'Los Angeles', metadata.address_state ?? 'CA',
          metadata.address_zip || undefined, metadata.address_apn || undefined,
          tier, customerEmail || undefined, c.env, apiKey,
        ).catch(async (e) => {
          await logFailure(c.env, 'report_generation', String(e), street)
        }),
      )
    }

    return c.json({ received: true, event_type: eventType, api_key: apiKey })
  }

  return c.json({ received: true, event_type: eventType })
})

// ── ADMIN API ─────────────────────────────────────────────────────────────────
// Phase 4: All routes protected by ADMIN_SECRET middleware above.

// GET /admin/keys — list all customers
app.get('/admin/keys', async (c) => {
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'KV not configured' }, 503)

  const listed = await c.env.SEVENNOVA_KEYS.list({ prefix: 'key_' })
  const keys: Record<string, unknown>[] = []

  for (const kv of (listed.keys as Array<{ name: string }>) ?? []) {
    const raw = await c.env.SEVENNOVA_KEYS.get(kv.name)
    if (!raw) continue
    try {
      const data = JSON.parse(raw)
      keys.push({ id: kv.name, ...data })
    } catch { /* skip malformed */ }
  }

  return c.json({ count: keys.length, keys })
})

// GET /admin/keys/:id — key detail + usage
app.get('/admin/keys/:id', async (c) => {
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'KV not configured' }, 503)
  const id = c.req.param('id')
  const raw = await c.env.SEVENNOVA_KEYS.get(id)
  if (!raw) return c.json({ error: 'Key not found' }, 404)

  let data: Record<string, unknown> = {}
  try { data = JSON.parse(raw) } catch { /* ignore */ }

  // Fetch today's usage
  const today = new Date().toISOString().slice(0, 10)
  const rlRaw = await c.env.SEVENNOVA_KEYS.get(`ratelimit:${id}:${today}`)
  const todayUsage = rlRaw ? parseInt(rlRaw, 10) : 0

  return c.json({ id, ...data, usage_today: todayUsage })
})

// POST /admin/keys/:id/revoke — revoke key
app.post('/admin/keys/:id/revoke', async (c) => {
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'KV not configured' }, 503)
  const id = c.req.param('id')
  const raw = await c.env.SEVENNOVA_KEYS.get(id)
  if (!raw) return c.json({ error: 'Key not found' }, 404)

  let data: Record<string, unknown> = {}
  try { data = JSON.parse(raw) } catch { /* ignore */ }

  // Mark revoked rather than delete — preserves audit trail
  data.status = 'revoked'
  data.revoked_at = new Date().toISOString()
  await c.env.SEVENNOVA_KEYS.put(id, JSON.stringify(data))

  // Also invalidate active sessions
  if (data.session_id) {
    await c.env.SEVENNOVA_KEYS.delete(`session:${data.session_id}`).catch(() => {})
  }

  return c.json({ revoked: true, id, email: data.email })
})

// GET /admin/reports/:audit_id — retrieve audit record
app.get('/admin/reports/:audit_id', async (c) => {
  const auditId = c.req.param('audit_id')
  const record = await getAuditRecord(c.env, auditId)
  if (!record) return c.json({ error: 'Audit record not found' }, 404)
  return c.json(record)
})

// GET /admin/usage/export — monthly usage for all keys (billing reconciliation)
app.get('/admin/usage/export', async (c) => {
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'KV not configured' }, 503)
  const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7)
  const listed = await c.env.SEVENNOVA_KEYS.list({ prefix: `usage:monthly:` })
  const rows: Record<string, unknown>[] = []
  for (const kv of (listed.keys as Array<{ name: string }>) ?? []) {
    if (!kv.name.includes(`:${month}`)) continue
    const parts = kv.name.split(':')
    const keyId = parts[2] ?? ''
    const raw = await c.env.SEVENNOVA_KEYS.get(kv.name)
    rows.push({ api_key: keyId, month, reports_generated: raw ? parseInt(raw, 10) : 0 })
  }
  return c.json({ month, count: rows.length, usage: rows })
})

// ── MANUAL REVIEW QUEUE ───────────────────────────────────────────────────────

// GET /admin/review-queue — paginated list of pending manual review items
app.get('/admin/review-queue', async (c) => {
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'KV not configured' }, 503)
  const cursor = c.req.query('cursor') ?? undefined
  const limitParam = parseInt(c.req.query('limit') ?? '20', 10)
  const limit = Math.min(Math.max(limitParam, 1), 100)
  const resolved = c.req.query('resolved') === 'true'

  const listed = await c.env.SEVENNOVA_KEYS.list({ prefix: 'review:', cursor, limit: limit * 3 })
  const items: Record<string, unknown>[] = []

  for (const kv of (listed.keys as Array<{ name: string }>) ?? []) {
    if (items.length >= limit) break
    const raw = await c.env.SEVENNOVA_KEYS.get(kv.name)
    if (!raw) continue
    try {
      const entry = JSON.parse(raw) as Record<string, unknown>
      if (Boolean(entry.resolved) !== resolved) continue
      items.push({ kv_key: kv.name, ...entry })
    } catch { /* skip malformed */ }
  }

  return c.json({
    count: items.length,
    resolved,
    next_cursor: (listed as unknown as { cursor?: string }).cursor ?? null,
    items,
  })
})

// POST /admin/review-queue/:audit_id/resolve — mark a review item resolved
app.post('/admin/review-queue/:audit_id/resolve', async (c) => {
  if (!c.env.SEVENNOVA_KEYS) return c.json({ error: 'KV not configured' }, 503)
  const auditId = c.req.param('audit_id')
  const key = `review:${auditId}`
  const raw = await c.env.SEVENNOVA_KEYS.get(key)
  if (!raw) return c.json({ error: 'Review item not found' }, 404)

  let entry: Record<string, unknown> = {}
  try { entry = JSON.parse(raw) } catch {
    return c.json({ error: 'Malformed review record' }, 500)
  }

  let body: Record<string, unknown> = {}
  try { body = await c.req.json() } catch { /* no body required */ }

  entry.resolved = true
  entry.resolved_at = new Date().toISOString()
  entry.resolved_by = body.resolved_by ?? 'admin'
  entry.resolution_notes = body.notes ?? ''

  await c.env.SEVENNOVA_KEYS.put(key, JSON.stringify(entry), { expirationTtl: 86400 * 90 })
  return c.json({ resolved: true, audit_id: auditId, resolved_at: entry.resolved_at })
})

// Phase 5: Customer usage endpoint (own key only — no admin required)
app.get('/api/v1/usage', async (c) => {
  const apiKey = c.req.header('X-API-Key') ?? ''
  if (!apiKey || !c.env.SEVENNOVA_KEYS) return c.json({ error: 'unauthorized' }, 401)
  const month = new Date().toISOString().slice(0, 7)
  const today = new Date().toISOString().slice(0, 10)
  const [monthlyRaw, dailyRaw, keyData] = await Promise.all([
    c.env.SEVENNOVA_KEYS.get(`usage:monthly:${apiKey}:${month}`),
    c.env.SEVENNOVA_KEYS.get(`ratelimit:${apiKey}:${today}`),
    c.env.SEVENNOVA_KEYS.get(apiKey),
  ])
  let tier = 'full'
  try { tier = JSON.parse(keyData ?? '{}').tier ?? 'full' } catch { /* */ }
  const limits: Record<string, number> = { basic: 3, full: 10, institutional: 25 }
  return c.json({
    tier,
    month,
    reports_this_month: monthlyRaw ? parseInt(monthlyRaw, 10) : 0,
    reports_today: dailyRaw ? parseInt(dailyRaw, 10) : 0,
    daily_limit: limits[tier] ?? 10,
  })
})

// ── FAILURE LOGGER ─────────────────────────────────────────────────────────────
// Phase 8: Log failures to KV + send alert email on critical errors

async function logFailure(env: Env, category: string, error: string, context = '') {
  if (!env.SEVENNOVA_KEYS) return
  const key = `failure:${category}:${Date.now()}`
  await env.SEVENNOVA_KEYS.put(
    key,
    JSON.stringify({ category, error: error.slice(0, 500), context, timestamp: new Date().toISOString() }),
    { expirationTtl: 86400 * 7 },
  ).catch(() => {})

  const criticalCategories = new Set(['stripe_checkout', 'stripe_webhook', 'email_onboarding', 'pdf_generation'])
  if (criticalCategories.has(category)) {
    sendEmail(
      env,
      'dan.issak@gmail.com',
      `[SevenNova] CRITICAL FAILURE — ${category}`,
      `<h2>SevenNova Critical Failure</h2>
<p><strong>Category:</strong> ${category}</p>
<p><strong>Error:</strong> ${error.slice(0, 1000)}</p>
<p><strong>Context:</strong> ${context}</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
<p><strong>KV Key:</strong> <code>${key}</code></p>`,
    ).catch(() => {})
  }
}

// ── CRON HANDLERS ─────────────────────────────────────────────────────────────

export default {
  fetch: app.fetch.bind(app),

  async scheduled(event: { cron: string }, env: Env, ctx: { waitUntil: (p: Promise<unknown>) => void }): Promise<void> {
    if (event.cron === '0 6 * * *') {
      ctx.waitUntil(runHealthCheck(env))
    } else if (event.cron === '0 2 * * *') {
      ctx.waitUntil(runCacheInvalidation(env))
    }
  },
}

// ── PHASE 7 — API SUBSCRIPTION ARCHITECTURE (DOCUMENTATION ONLY) ─────────────
//
// Metered billing via Stripe Billing would plug in at these points:
//
// 1. Checkout: Change mode from 'payment' to 'subscription' in stripe.ts.
//    Use a metered Price with aggregate_usage='sum'.
//    The subscription creates a Customer + Subscription object.
//
// 2. Webhook: On 'customer.subscription.created', store subscription_id in key record.
//    On 'customer.subscription.deleted', revoke API key (call /admin/keys/:id/revoke logic).
//
// 3. Usage reporting: After each successful report, call Stripe Usage Records API:
//    POST /v1/subscription_items/{si_id}/usage_records
//    { quantity: 1, timestamp: Math.floor(Date.now() / 1000), action: 'increment' }
//
// 4. Rate limits: Remove KV-based hard caps; let Stripe enforce via usage alerts.
//    Keep soft caps as abuse protection only.
//
// 5. Billing portal: Add GET /api/v1/billing/portal → Stripe.billingPortal.sessions.create()
//    Returns a portal URL for customers to manage their subscription.
//
// No code changes to existing checkout flow — the architecture is additive.
