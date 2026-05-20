import type { Env } from '../orchestrator'

const TTL_MS = 24 * 60 * 60 * 1000
const PREFIXES = ['report:', 'parcel:']

export async function runCacheInvalidation(env: Env): Promise<void> {
  if (!env.SEVENNOVA_KEYS) return

  let deleted = 0
  let scanned = 0

  for (const prefix of PREFIXES) {
    let cursor: string | undefined
    do {
      const listed = await env.SEVENNOVA_KEYS.list({ prefix, cursor, limit: 1000 })
      cursor = listed.list_complete ? undefined : (listed as { cursor?: string }).cursor

      await Promise.all(
        listed.keys.map(async (key: { name: string }) => {
          scanned++
          try {
            const raw = await env.SEVENNOVA_KEYS.get(key.name)
            if (!raw) {
              await env.SEVENNOVA_KEYS.delete(key.name)
              deleted++
              return
            }
            const parsed = JSON.parse(raw) as { cached_at?: number }
            if (parsed.cached_at && Date.now() - parsed.cached_at > TTL_MS) {
              await env.SEVENNOVA_KEYS.delete(key.name)
              deleted++
            }
          } catch {
            // corrupted entry — delete it
            await env.SEVENNOVA_KEYS.delete(key.name)
            deleted++
          }
        }),
      )
    } while (cursor)
  }

  await env.SEVENNOVA_KEYS.put(
    'cache:last-purge',
    JSON.stringify({ timestamp: new Date().toISOString(), scanned, deleted }),
  )
}
