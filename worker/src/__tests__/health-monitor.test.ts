// health-monitor.test.ts — verifies the safe-parse + retry helper
// added to harden checks against transient upstream 5xx and Cloudflare HTML
// error pages (e.g. "error code: 525" SSL handshake failure).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchJsonSafe } from '../agents/health-monitor'

const realFetch = globalThis.fetch

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { globalThis.fetch = realFetch })

function mockFetchSequence(responses: Array<{ status?: number; body?: string; throws?: unknown }>) {
  let call = 0
  globalThis.fetch = vi.fn(async () => {
    const r = responses[Math.min(call++, responses.length - 1)]
    if (r.throws) throw r.throws
    return new Response(r.body ?? '', { status: r.status ?? 200 })
  }) as typeof globalThis.fetch
}

describe('fetchJsonSafe — happy path', () => {
  it('returns parsed JSON on 200', async () => {
    mockFetchSequence([{ status: 200, body: JSON.stringify({ ok: 1 }) }])
    const r = await fetchJsonSafe<{ ok: number }>('https://example.com/x')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.ok).toBe(1)
      expect(r.status).toBe(200)
    }
  })
})

describe('fetchJsonSafe — non-JSON response (Cloudflare 525 HTML page)', () => {
  it('does NOT crash on HTML body; returns ok=false with body preview', async () => {
    const cloudflareHtml = '<html><body>error code: 525</body></html>'
    mockFetchSequence([
      { status: 525, body: cloudflareHtml },
      { status: 525, body: cloudflareHtml },   // retry also fails
    ])
    const r = await fetchJsonSafe('https://example.com/x', {}, 1, 1)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.detail).toMatch(/525/)
      expect(r.detail).toMatch(/error code: 525/)
    }
  })
})

describe('fetchJsonSafe — transient 5xx with retry', () => {
  it('retries on 525 and succeeds on second attempt', async () => {
    mockFetchSequence([
      { status: 525, body: '<html>error code: 525</html>' },
      { status: 200, body: '{"recovered":true}' },
    ])
    const r = await fetchJsonSafe<{ recovered: boolean }>('https://example.com/x', {}, 1, 1)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.recovered).toBe(true)
  })
  it('retries on 530 and succeeds on second attempt', async () => {
    mockFetchSequence([
      { status: 530, body: 'error code: 530' },
      { status: 200, body: '{"ok":1}' },
    ])
    const r = await fetchJsonSafe('https://example.com/x', {}, 1, 1)
    expect(r.ok).toBe(true)
  })
})

describe('fetchJsonSafe — 4xx is NOT retried', () => {
  it('returns immediately on 404 without retrying', async () => {
    const calls = vi.fn(async () => new Response('not found', { status: 404 })) as typeof globalThis.fetch
    globalThis.fetch = calls
    const r = await fetchJsonSafe('https://example.com/x', {}, 3, 1)
    expect(r.ok).toBe(false)
    expect((calls as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1)
  })
})

describe('fetchJsonSafe — network failure', () => {
  it('retries on thrown fetch error then returns ok=false', async () => {
    mockFetchSequence([
      { throws: new Error('ECONNREFUSED') },
      { throws: new Error('ECONNREFUSED') },
    ])
    const r = await fetchJsonSafe('https://example.com/x', {}, 1, 1)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.detail).toMatch(/ECONNREFUSED|fetch error/)
  })
  it('recovers if a single network error is followed by success', async () => {
    mockFetchSequence([
      { throws: new Error('boom') },
      { status: 200, body: '{"recovered":true}' },
    ])
    const r = await fetchJsonSafe<{ recovered: boolean }>('https://example.com/x', {}, 1, 1)
    expect(r.ok).toBe(true)
  })
})

describe('fetchJsonSafe — empty body / 200 with no content', () => {
  it('200 + empty body returns ok=false (no parsed JSON)', async () => {
    mockFetchSequence([{ status: 200, body: '' }, { status: 200, body: '' }])
    const r = await fetchJsonSafe('https://example.com/x', {}, 1, 1)
    expect(r.ok).toBe(false)
  })
})
