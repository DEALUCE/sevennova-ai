// feasibility.test.ts — Phase 5D ground-truth audit
// Confirms the root feasibility engine produces correct unit counts for
// 904 S Ardmore Ave (R4-2, ±6,750 sf, TOC Tier 3) — replacing the prior
// 1 / 5 / 5 garbage output. Tests the JS engine directly (no live calls).

import { describe, it, expect } from 'vitest'
// @ts-expect-error — plain JS module
import { parseZone, calcDevelopment, calcEntitlementAnalysis, reconcileParcelIdentity } from '../../../functions/api/zoning.js'
import { analyzeEntitlement } from '../entitlement'

// ─────────────────────────────────────────────────────────────────────────────
// 1. parseZone correctness — was returning unknown / df=1.0 for R4-2
// ─────────────────────────────────────────────────────────────────────────────
describe('parseZone — LAMC density table', () => {
  it('R4-2 resolves to R4 class, multifamily, 400 sf/unit', () => {
    const z = parseZone('R4-2')
    expect(z.zone_class).toBe('R4')
    expect(z.multifamily).toBe(true)
    expect(z.sf_per_unit).toBe(400)
    expect(z.needs_input).toBeFalsy()
  })
  it('R3-1 resolves to R3, 800 sf/unit', () => {
    const z = parseZone('R3-1')
    expect(z.zone_class).toBe('R3')
    expect(z.sf_per_unit).toBe(800)
  })
  it('R5-3 resolves to R5, 200 sf/unit', () => {
    const z = parseZone('R5-3')
    expect(z.zone_class).toBe('R5')
    expect(z.sf_per_unit).toBe(200)
  })
  it('R1V2 (Oakmore) resolves to R1, single-unit', () => {
    const z = parseZone('R1V2')
    expect(z.zone_class).toBe('R1')
    expect(z.single_unit).toBe(true)
  })
  it('RD1.5-1XL resolves to RD1, 1500 sf/unit', () => {
    const z = parseZone('RD1.5-1XL')
    expect(z.zone_class).toBe('RD1')
    expect(z.sf_per_unit).toBe(1500)
  })
  it('C4-2 (Wilshire) resolves to C4, residential @ 400 sf/unit', () => {
    const z = parseZone('C4-2')
    expect(z.zone_class).toBe('C4')
    expect(z.sf_per_unit).toBe(400)
  })
  it('[Q]C4-2-CDO bracket overlay parses to C4', () => {
    const z = parseZone('[Q]C4-2-CDO')
    expect(z.zone_class).toBe('C4')
  })
  it('UNKNOWN county code (BUC3*) returns needs_input — NOT silent default to 1', () => {
    const z = parseZone('BUC3*')
    expect(z.needs_input).toBe(true)
    expect(z.zone_class).toBeNull()
    expect(z.sf_per_unit).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. calcDevelopment — Ardmore baseline math
//    Lot: 6,750 sf, Zone: R4-2, TOC Tier 3
//    Expected: base ≈ 16, TOC ≈ 24, state-bonus ≈ 21, max ≈ 24
// ─────────────────────────────────────────────────────────────────────────────
describe('calcDevelopment — 904 S Ardmore baseline (R4-2, 6,750 sf, TOC 3)', () => {
  const parcel  = { sqft_lot: 6750 }
  const toc     = { tier: 3, eligible: true }
  const zoneInfo = parseZone('R4-2')
  const zimas   = { max_far: 2.25, height_limit_ft: 45 }
  const dev = calcDevelopment(parcel, toc, zoneInfo, zimas)

  it('base_units_by_right ≈ 16 (lot/400)', () => {
    expect(dev.base_units_by_right).toBe(Math.floor(6750 / 400))   // 16
    expect(dev.base_units_by_right).toBe(16)
  })
  it('NOT 1 (the old broken value)', () => {
    expect(dev.base_units_by_right).not.toBe(1)
  })
  it('toc_units in 22–26 range (Tier 3 = +50% bonus)', () => {
    expect(dev.toc_units).toBeGreaterThanOrEqual(22)
    expect(dev.toc_units).toBeLessThanOrEqual(26)
  })
  it('max_potential_units in 22–28 range, NOT 5', () => {
    expect(dev.max_potential_units).toBeGreaterThanOrEqual(22)
    expect(dev.max_potential_units).toBeLessThanOrEqual(28)
    expect(dev.max_potential_units).not.toBe(5)
  })
  it('emits zone_class + sf_per_unit + max_far for downstream gating', () => {
    expect(dev.zone_class).toBe('R4')
    expect(dev.sf_per_unit).toBe(400)
    expect(dev.max_far).toBe(2.25)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. calcDevelopment — fail-closed when zone is unknown (no silent 1-unit)
// ─────────────────────────────────────────────────────────────────────────────
describe('calcDevelopment — fail-closed on unknown zone', () => {
  const dev = calcDevelopment({ sqft_lot: 6750 }, { tier: 3, eligible: true }, parseZone('BUC3*'), null)
  it('returns NEEDS_INPUT when zone unresolved', () => {
    expect(dev.needs_input).toBe(true)
    expect(dev.base_units_by_right).toBeNull()
    expect(dev.max_potential_units).toBeNull()
  })
  it('does NOT silently return 1 unit', () => {
    expect(dev.base_units_by_right).not.toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. calcEntitlementAnalysis — ED1 formula
//    Expected: base 16 × 1.80 = 28-29 units, NOT 5
// ─────────────────────────────────────────────────────────────────────────────
describe('calcEntitlementAnalysis — ED1 math for R4-2 6,750 sf', () => {
  const parcel  = { sqft_lot: 6750, zoning_pdb: 'R4-2' }
  const toc     = { tier: 3, eligible: true }
  const zoneInfo = parseZone('R4-2')
  const zimas   = { max_far: 2.25, height_limit_ft: 45 }
  const dev = calcDevelopment(parcel, toc, zoneInfo, zimas)
  const ea  = calcEntitlementAnalysis(parcel, toc, zoneInfo, dev)
  const ed1 = ea.pathways.find((p: { id: string; max_units: number }) => p.id === 'ed1')

  it('ED1 pathway present and eligible (base ≥ 5 after density bonus)', () => {
    expect(ed1).toBeDefined()
    expect(ed1.max_units).not.toBeNull()
  })
  it('ED1 max_units ≈ 28-29 (16 × 1.80 = 28.8 → floor 28)', () => {
    expect(ed1.max_units).toBeGreaterThanOrEqual(28)
    expect(ed1.max_units).toBeLessThanOrEqual(30)
  })
  it('ED1 max_units is NOT the old broken 5', () => {
    expect(ed1.max_units).not.toBe(5)
  })
  it('ED1 citation references state density bonus statute', () => {
    expect(ed1.citation).toMatch(/65915/)
  })
  it('units_max_any_path in 24–30 range (was 5)', () => {
    expect(ea.units_max_any_path).toBeGreaterThanOrEqual(24)
    expect(ea.units_max_any_path).toBeLessThanOrEqual(30)
  })
  it('units_by_right = 16 (was 1)', () => {
    expect(ea.units_by_right).toBe(16)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. ED1 eligibility minimum — kept as gate, not output
// ─────────────────────────────────────────────────────────────────────────────
describe('calcEntitlementAnalysis — ED1 eligibility minimum semantics', () => {
  // R1 parcel: base = 1, ed1 = floor(1 × 1.80) = 1 → below 5-unit eligibility minimum
  const parcel = { sqft_lot: 7000, zoning_pdb: 'R1' }
  const toc = { tier: 0, eligible: false }
  const zoneInfo = parseZone('R1V2')
  const dev = calcDevelopment(parcel, toc, zoneInfo, { max_far: 0.5, height_limit_ft: 25 })
  const ea = calcEntitlementAnalysis(parcel, toc, zoneInfo, dev)
  const ed1 = ea.pathways.find((p: { id: string; max_units: number | null; name: string }) => p.id === 'ed1')

  it('R1 parcel does NOT receive a fake 5-unit ED1 output', () => {
    expect(ed1).toBeDefined()
    expect(ed1.max_units).toBeNull()
    expect(ed1.name).toMatch(/NEEDS_REVIEW/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Parcel-identity reconciliation
// ─────────────────────────────────────────────────────────────────────────────
describe('reconcileParcelIdentity', () => {
  it('flags BUC3* (county code) as NEEDS_REVIEW when ZIMAS returns LA City R4', () => {
    const r = reconcileParcelIdentity({ zoning_pdb: 'BUC3*', apn: '2453-040-002' }, { zone_class: 'R4', zone_code: 'R4-2' })
    expect(r.status).toBe('NEEDS_REVIEW')
    expect(r.reason).toMatch(/not an LA City zoning code/i)
  })
  it('VERIFIED when Assessor zoning matches ZIMAS class', () => {
    const r = reconcileParcelIdentity({ zoning_pdb: 'R4-2', apn: '5094-021-015' }, { zone_class: 'R4', zone_code: 'R4-2' })
    expect(r.status).toBe('VERIFIED')
  })
  it('NEEDS_INPUT when ZIMAS unavailable', () => {
    const r = reconcileParcelIdentity({ zoning_pdb: 'R4-2' }, null)
    expect(r.status).toBe('NEEDS_INPUT')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. TS engine parity — ED1 fix mirrors the JS fix
// ─────────────────────────────────────────────────────────────────────────────
describe('TS entitlement engine — ED1 parity with JS fix', () => {
  // Input semantics (per EntitlementInput in entitlement.ts):
  //   units_by_right   = base zoning units (16 for R4-2 at 6,750 sf)
  //   units_toc_bonus  = ADDITIVE bonus over base (Tier 3 = +50% → +8 units)
  // → totalTocUnits = units_by_right + units_toc_bonus = 16 + 8 = 24
  // → ed1FromBase   = floor(16 × 1.80) = 28
  // → ed1Units      = max(24, 28) = 28
  const result = analyzeEntitlement({
    zone: 'R4-2',
    lot_size_sf: 6750,
    toc_tier: 3,
    ed1_eligible: true,
    sb9_eligible: false,
    ab2011_eligible: false,
    in_hpoz: false,
    in_liquefaction_zone: false,
    in_landslide_area: false,
    units_by_right: 16,
    units_toc_bonus: 8,
    near_transit: true,
    community_plan_area: 'Wilshire',
  })

  it('ED1 pathway present', () => {
    const ed1 = result.pathways.find(p => p.id === 'ed1')
    expect(ed1).toBeDefined()
  })
  it('ED1 max_units uses +80% state density bonus (≈ 28, NOT old base × 2 = 32 nor old 5)', () => {
    const ed1 = result.pathways.find(p => p.id === 'ed1')!
    expect(ed1.max_units).toBe(28)
    expect(ed1.max_units).not.toBe(5)
    expect(ed1.max_units).not.toBe(32)   // old base×2 yielded 32 for this exact input
  })
})
