import { describe, it, expect } from 'vitest'
import {
  adaptZimas,
  adaptLADBSPermits,
  adaptLADBSViolations,
  adaptFEMA,
  adaptCalFire,
  adaptCensusHUD,
  adaptLATreasurer,
  adaptCASOSUCC,
  adaptLARecorder,
  adaptLASuperiorCourt,
  adaptCADeptInsurance,
  collectSourceRegistry,
} from '../adapter'
import { SOURCE_REGISTRY } from '../registry'

const BASE_PARAMS = {
  address: '3612 W Jefferson Blvd, Los Angeles, CA 90016',
  street: '3612 W Jefferson Blvd',
  city: 'Los Angeles',
  state: 'CA',
  zip_code: '90016',
}

// ── Test 1: ZIMAS adapter returns VERIFIED when data present ──────────────────
describe('adaptZimas', () => {
  it('returns VERIFIED when zimas data is present', () => {
    const result = adaptZimas({
      ...BASE_PARAMS,
      prefetched: {
        zimas: {
          source: 'zimas',
          lat: 34.0112,
          lon: -118.3239,
          zone_code: 'C2-2D-SP',
          zone_class: 'C2',
          height_district: '2',
          zone_description: 'Commercial',
          max_far: 1.5,
          height_limit_ft: 45,
          height_limit_stories: 4,
          raw: {},
        },
      },
    })
    expect(result.status).toBe('VERIFIED')
    expect(result.source_type).toBe('PUBLIC_RECORD')
    expect(result.confidence).toBeGreaterThan(0)
    expect((result.value as Record<string, unknown>).zone_code).toBe('C2-2D-SP')
  })

  it('returns UNAVAILABLE when zimas is null', () => {
    const result = adaptZimas({ ...BASE_PARAMS, prefetched: { zimas: null } })
    expect(result.status).toBe('UNAVAILABLE')
    expect(result.confidence).toBe(0)
  })

  it('returns UNAVAILABLE when zimas has error', () => {
    const result = adaptZimas({
      ...BASE_PARAMS,
      prefetched: {
        zimas: {
          source: 'zimas', lat: 0, lon: 0, zone_code: 'UNKNOWN', zone_class: 'UNKNOWN',
          height_district: '1', zone_description: '', max_far: null, height_limit_ft: null,
          height_limit_stories: null, raw: {}, error: 'Geocoding failed',
        },
      },
    })
    expect(result.status).toBe('UNAVAILABLE')
  })
})

// ── Test 2: LADBS permits adapter returns VERIFIED ─────────────────────────────
describe('adaptLADBSPermits', () => {
  it('returns VERIFIED when ladbs data present', () => {
    const result = adaptLADBSPermits({
      ...BASE_PARAMS,
      prefetched: { ladbs: { active_violations: 50, permit_count: 12, violation_count: 50 } },
    })
    expect(result.status).toBe('VERIFIED')
    expect((result.value as Record<string, unknown>).permit_count).toBe(12)
  })

  it('returns UNAVAILABLE when ladbs is null', () => {
    const result = adaptLADBSPermits({ ...BASE_PARAMS, prefetched: { ladbs: null } })
    expect(result.status).toBe('UNAVAILABLE')
  })
})

// ── Test 3: LADBS violations adapter ─────────────────────────────────────────
describe('adaptLADBSViolations', () => {
  it('returns VERIFIED with active violation count', () => {
    const result = adaptLADBSViolations({
      ...BASE_PARAMS,
      prefetched: { ladbs: { active_violations: 50, permit_count: 12, violation_count: 63 } },
    })
    expect(result.status).toBe('VERIFIED')
    expect((result.value as Record<string, unknown>).active_violations).toBe(50)
  })
})

// ── Test 4: FEMA adapter ──────────────────────────────────────────────────────
describe('adaptFEMA', () => {
  it('returns VERIFIED when flood zone present', () => {
    const result = adaptFEMA({ ...BASE_PARAMS, prefetched: { fema: { flood_zone: 'X' } } })
    expect(result.status).toBe('VERIFIED')
    expect((result.value as Record<string, unknown>).flood_zone).toBe('X')
  })

  it('returns UNAVAILABLE when fema is null', () => {
    const result = adaptFEMA({ ...BASE_PARAMS, prefetched: { fema: null } })
    expect(result.status).toBe('UNAVAILABLE')
  })
})

// ── Test 5: CalFire adapter ───────────────────────────────────────────────────
describe('adaptCalFire', () => {
  it('returns VERIFIED with fire hazard zone', () => {
    const result = adaptCalFire({ ...BASE_PARAMS, prefetched: { calfire: { fire_hazard_zone: 'NONE' } } })
    expect(result.status).toBe('VERIFIED')
  })
})

// ── Test 6: LA Treasurer always NEEDS_HUMAN_REVIEW ───────────────────────────
describe('adaptLATreasurer', () => {
  it('always returns NEEDS_HUMAN_REVIEW (no machine-readable API)', () => {
    const result = adaptLATreasurer({ ...BASE_PARAMS, apn: '5028-023-012' })
    expect(result.status).toBe('NEEDS_HUMAN_REVIEW')
    expect(result.source_type).toBe('OFFICIAL_PORTAL_ONLY')
    expect(result.manual_review_required).toBe(true)
    expect(result.source_url).toContain('5028023012')
  })

  it('returns generic portal URL when no APN', () => {
    const result = adaptLATreasurer({ ...BASE_PARAMS })
    expect(result.status).toBe('NEEDS_HUMAN_REVIEW')
    expect(result.source_url).toContain('ttc.lacounty.gov')
  })
})

// ── Test 7: CA SOS UCC always UNAVAILABLE (subscription required) ─────────────
describe('adaptCASOSUCC', () => {
  it('returns UNAVAILABLE with subscription note', () => {
    const result = adaptCASOSUCC(BASE_PARAMS)
    expect(result.status).toBe('UNAVAILABLE')
    expect(result.requires_subscription).toBe(true)
    expect(result.notes).toContain('data agreement')
  })
})

// ── Test 8: Source registry has all required fields for every entry ───────────
describe('SOURCE_REGISTRY', () => {
  it('has 17 entries', () => {
    expect(SOURCE_REGISTRY).toHaveLength(17)
  })

  it('every entry has required fields', () => {
    for (const entry of SOURCE_REGISTRY) {
      expect(entry.source_name).toBeTruthy()
      expect(entry.official_url).toBeTruthy()
      expect(entry.classification).toBeTruthy()
      expect(typeof entry.machine_readable).toBe('boolean')
      expect(typeof entry.requires_subscription).toBe('boolean')
      expect(typeof entry.manual_review_required).toBe('boolean')
      expect(entry.implementation_status).toBeTruthy()
      expect(entry.fallback_behavior).toBeTruthy()
    }
  })

  it('LIVE entries are all sources 1-6', () => {
    const live = SOURCE_REGISTRY.filter(e => e.implementation_status === 'LIVE')
    expect(live.length).toBeGreaterThanOrEqual(6)
  })

  it('collectSourceRegistry returns 11 results (adapters only, not registry-only)', () => {
    const results = collectSourceRegistry(BASE_PARAMS)
    expect(results).toHaveLength(11)
  })
})

// ── Test 9: CA Dept Insurance returns market-level signal ────────────────────
describe('adaptCADeptInsurance', () => {
  it('returns VERIFIED market signal for LA zip', () => {
    const result = adaptCADeptInsurance({ ...BASE_PARAMS, zip_code: '90016' })
    expect(result.status).toBe('VERIFIED')
    expect(result.source_type).toBe('MARKET_LEVEL_ONLY')
    expect((result.value as Record<string, unknown>).data_level).toBe('MARKET_AGGREGATE')
  })

  it('flags high-risk zip codes', () => {
    const result = adaptCADeptInsurance({ ...BASE_PARAMS, zip_code: '90210' })
    expect(result.status).toBe('VERIFIED')
    const val = result.value as Record<string, unknown>
    expect(String(val.market_signal)).toContain('HIGH_RISK_ZONE')
  })
})

// ── Test 10: LA Recorder returns NEEDS_HUMAN_REVIEW ──────────────────────────
describe('adaptLARecorder', () => {
  it('returns NEEDS_HUMAN_REVIEW (no public API)', () => {
    const result = adaptLARecorder({ ...BASE_PARAMS, apn: '5028-023-012' })
    expect(result.status).toBe('NEEDS_HUMAN_REVIEW')
    expect(result.manual_review_required).toBe(true)
  })
})

// ── Test 11: LA Superior Court returns NEEDS_HUMAN_REVIEW ────────────────────
describe('adaptLASuperiorCourt', () => {
  it('returns NEEDS_HUMAN_REVIEW (paid portal)', () => {
    const result = adaptLASuperiorCourt(BASE_PARAMS)
    expect(result.status).toBe('NEEDS_HUMAN_REVIEW')
    expect(result.requires_subscription).toBe(true)
  })
})
