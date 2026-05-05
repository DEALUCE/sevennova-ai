import type { Env } from './orchestrator'

export interface CheckoutRequest {
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  address_apn?: string
  tier: string
  customer_email?: string
  customer_name?: string
  success_url?: string
  cancel_url?: string
}

const TIER_PRICE_ENV: Record<string, keyof Env> = {
  basic: 'STRIPE_PRICE_BASIC',
  full: 'STRIPE_PRICE_FULL',
  institutional: 'STRIPE_PRICE_INSTITUTIONAL',
}

export async function createCheckoutSession(
  body: CheckoutRequest,
  env: Env,
): Promise<{ checkout_url: string; session_id: string; tier: string; address: string }> {
  const priceEnvKey = TIER_PRICE_ENV[body.tier]
  if (!priceEnvKey) throw new Error(`Unknown tier: ${body.tier}`)
  const priceId = env[priceEnvKey] as string
  if (!priceId) throw new Error(`Stripe price not configured for tier: ${body.tier}`)

  const metadata: Record<string, string> = {
    address_street: body.address_street,
    address_city: body.address_city ?? 'Los Angeles',
    address_state: body.address_state ?? 'CA',
    address_zip: body.address_zip ?? '',
    address_apn: body.address_apn ?? '',
    tier: body.tier,
    email: body.customer_email ?? '',
    customer_name: body.customer_name ?? '',
  }

  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: body.success_url ?? 'https://sevennova.ai/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: body.cancel_url ?? 'https://sevennova.ai/#pricing',
  })

  if (body.customer_email) params.set('customer_email', body.customer_email)

  for (const [k, v] of Object.entries(metadata)) {
    params.set(`metadata[${k}]`, v)
    params.set(`payment_intent_data[metadata][${k}]`, v)
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Stripe error ${res.status}`)
  }

  const session = await res.json() as { id: string; url: string }
  return {
    checkout_url: session.url,
    session_id: session.id,
    tier: body.tier,
    address: body.address_street,
  }
}

export async function verifyStripeSignature(
  payload: ArrayBuffer,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts: Record<string, string> = {}
    for (const item of signature.split(',')) {
      const [k, v] = item.split('=')
      if (k && v) parts[k] = v
    }
    const timestamp = parts['t']
    const sig = parts['v1']
    if (!timestamp || !sig) return false

    const payloadText = new TextDecoder().decode(payload)
    const signedPayload = `${timestamp}.${payloadText}`
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const signed = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload))
    const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')

    return expected === sig
  } catch {
    return false
  }
}
