import type { Env } from '../orchestrator'
import { sendEmail } from './resend'

export async function sendOnboardingEmail(
  env: Env,
  apiKey: string,
  tier: string,
  customerEmail: string,
): Promise<void> {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  const curlExample = `curl -X POST https://api.sevennova.ai/api/v1/report \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"street":"3612 W Jefferson Blvd","city":"Los Angeles","state":"CA","zip_code":"90016","tier":"${tier}"}'`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Courier New', monospace; background: #04080f; color: #e8f0fe; margin: 0; padding: 40px 20px; }
  .card { max-width: 600px; margin: 0 auto; background: #070d18; border: 1px solid rgba(0,212,255,0.15); padding: 40px; }
  h1 { color: #00d4ff; font-size: 1.4rem; margin-bottom: 8px; }
  .label { font-size: 0.65rem; letter-spacing: 0.12em; color: #5a7090; text-transform: uppercase; margin-bottom: 6px; }
  .value { background: #0a1220; border: 1px solid rgba(0,212,255,0.1); padding: 12px 16px; font-size: 0.9rem; color: #00d4ff; margin-bottom: 20px; word-break: break-all; }
  pre { background: #0a1220; border: 1px solid rgba(255,255,255,0.06); padding: 16px; font-size: 0.75rem; overflow-x: auto; color: #94a3b8; white-space: pre-wrap; }
  a { color: #00d4ff; }
  .footer { margin-top: 32px; font-size: 0.7rem; color: #5a7090; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; }
</style></head>
<body>
<div class="card">
  <h1>Welcome to SevenNova.ai</h1>
  <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:28px;">Your ${tierLabel} plan is active. Here is everything you need to start.</p>

  <div class="label">Your API Key</div>
  <div class="value">${apiKey}</div>

  <div class="label">Plan Tier</div>
  <div class="value">${tierLabel}</div>

  <div class="label">Quick Start — Test Your Key</div>
  <pre>${curlExample}</pre>

  <p style="margin-top:24px;font-size:0.85rem;color:#94a3b8;">
    Or use the web interface: <a href="https://sevennova.ai/analyze">sevennova.ai/analyze</a>
  </p>

  <div class="footer">
    Keep your API key secret. For support: <a href="mailto:info@sevennova.ai">info@sevennova.ai</a><br>
    © 2026 SevenNova.ai — Not a licensed appraisal or investment advice.
  </div>
</div>
</body>
</html>`

  const ok = await sendEmail(env, customerEmail, `Welcome to SevenNova — Your ${tierLabel} API Key`, html)

  if (!ok && env.SEVENNOVA_KEYS) {
    await env.SEVENNOVA_KEYS.put(
      `onboarding:failed:${customerEmail}`,
      JSON.stringify({ email: customerEmail, apiKey, tier, attempted_at: new Date().toISOString() }),
    )
  }
}
