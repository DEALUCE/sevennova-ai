/**
 * PHASE 3 — Per-key daily rate limiting backed by Cloudflare KV
 * Basic: 3/day  |  Full: 10/day  |  Institutional: 25/day
 */
import type { Env } from './orchestrator'

const TIER_LIMITS: Record<string, number> = {
  basic: 3,
  full: 10,
  institutional: 25,
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset_at: string // ISO date (midnight UTC)
}

export async function checkRateLimit(env: Env, apiKey: string, tier: string): Promise<RateLimitResult> {
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.full
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const rlKey = `ratelimit:${apiKey}:${today}`

  if (!env.SEVENNOVA_KEYS) {
    // No KV — allow but can't track
    return { allowed: true, limit, remaining: limit - 1, reset_at: nextMidnight() }
  }

  const raw = await env.SEVENNOVA_KEYS.get(rlKey)
  const count = raw ? parseInt(raw, 10) : 0

  if (count >= limit) {
    return { allowed: false, limit, remaining: 0, reset_at: nextMidnight() }
  }

  // Increment; TTL = 25 hours to survive timezone edge cases
  await env.SEVENNOVA_KEYS.put(rlKey, String(count + 1), { expirationTtl: 90000 })

  return { allowed: true, limit, remaining: limit - count - 1, reset_at: nextMidnight() }
}

function nextMidnight(): string {
  const d = new Date()
  d.setUTCHours(24, 0, 0, 0)
  return d.toISOString()
}
