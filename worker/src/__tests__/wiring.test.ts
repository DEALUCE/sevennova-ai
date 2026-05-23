// wiring.test.ts — Phase 5B
// Verifies massing_envelope wiring across both engines:
//   1. TS orchestrator path (computeMassing) — populated envelope when inputs exist
//   2. JS /api/zoning path (calcMassingEnvelope) — NEEDS_INPUT when FAR/height missing
// Plus output-safety contract checks (3–5).

import { describe, it, expect } from 'vitest'
import { computeMassing } from '../massing'
// JS port from the live /api/zoning path — same shape, same gates
// @ts-expect-error — plain JS module, no .d.ts
import { calcMassingEnvelope as jsCalcMassingEnvelope } from '../../../functions/api/zoning.js'

// ─────────────────────────────────────────────────────────────────────────────
// 1. TS orchestrator path — same input shape the orchestrator extracts from
//    parcelData + zoning DataPoints + entitlement.recommended_path
// ─────────────────────────────────────────────────────────────────────────────
describe('TS orchestrator wiring — populated envelope when lot_size, FAR, height all present', () => {
  // Mirrors the orchestrator's inline call signature
  const ts = computeMassing({
    lot_size_sf:      7000,
    lot_dimensions:   { width_ft: 60, depth_ft: 121 },
    zoning_code:      'R1V2',
    max_far:          1.5,
    height_limit_ft:  45,
    units_max:        10,
  })

  it('status OK (not NEEDS_INPUT)', () => {
    expect(ts.status).toBe('OK')
  })
  it('data_basis = RULE_BASED_ENVELOPE_ESTIMATE', () => {
    expect(ts.data_basis).toBe('RULE_BASED_ENVELOPE_ESTIMATE')
  })
  it('all numeric envelope fields populated (non-null)', () => {
    expect(ts.floors_estimated).not.toBeNull()
    expect(ts.floor_plate_sf_estimated).not.toBeNull()
    expect(ts.gross_building_area_sf_estimated).not.toBeNull()
    expect(ts.far_utilization_pct).not.toBeNull()
  })
  it('simple_geometry box rendered (lot + building)', () => {
    expect(ts.simple_geometry).not.toBeNull()
    expect(ts.simple_geometry!.lot.width_ft).toBe(60)
    expect(ts.simple_geometry!.lot.depth_ft).toBe(121)
    expect(ts.simple_geometry!.building.floors).toBeGreaterThan(0)
  })
  it('missing_inputs is empty', () => {
    expect(ts.missing_inputs).toEqual([])
  })
  it('zoning_code echoed', () => {
    expect(ts.zoning_code).toBe('R1V2')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. JS /api/zoning path — fail-closed when FAR/height not parsed.
//    Mirrors zoning.js: `parcel.sqft_lot` lives in parcel; FAR/height aren't
//    available in the JS pipeline today → must return NEEDS_INPUT.
// ─────────────────────────────────────────────────────────────────────────────
describe('JS /api/zoning wiring — NEEDS_INPUT when FAR/height missing', () => {
  const parcel = { sqft_lot: 7000, land_width: 60, land_depth: 121, zoning: 'R1V2' }
  const dev = { max_potential_units: 10 }
  const zoneInfo = { multifamily: false }
  const entitlement = { units_max_any_path: 10 }
  const js = jsCalcMassingEnvelope(parcel, dev, zoneInfo, entitlement) as {
    status: string; data_basis: string; missing_inputs: string[];
    floors_estimated: unknown; far_utilization_pct: unknown;
    height_compliance: string; simple_geometry: unknown;
    human_review_required: boolean; warnings: string[]; note?: string;
  }

  it('status = NEEDS_INPUT', () => {
    expect(js.status).toBe('NEEDS_INPUT')
  })
  it('data_basis = NEEDS_INPUT (never VERIFIED)', () => {
    expect(js.data_basis).toBe('NEEDS_INPUT')
  })
  it('missing_inputs lists max_far and height_limit_ft', () => {
    expect(js.missing_inputs).toContain('max_far')
    expect(js.missing_inputs).toContain('height_limit_ft')
  })
  it('lot_size_sf is NOT missing (parcel provided it)', () => {
    expect(js.missing_inputs).not.toContain('lot_size_sf')
  })
  it('numeric envelope fields are null', () => {
    expect(js.floors_estimated).toBeNull()
    expect(js.far_utilization_pct).toBeNull()
    expect(js.simple_geometry).toBeNull()
  })
  it('height_compliance = NEEDS_INPUT', () => {
    expect(js.height_compliance).toBe('NEEDS_INPUT')
  })
  it('note explains insufficient inputs', () => {
    expect(js.note).toMatch(/Insufficient zoning inputs/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3–5. Output-safety contract — applies to BOTH paths
// ─────────────────────────────────────────────────────────────────────────────
describe('Output-safety contract (TS + JS engines)', () => {
  const tsPopulated = computeMassing({ lot_size_sf: 7000, max_far: 1.5, height_limit_ft: 45 })
  const tsGated    = computeMassing({})   // all-missing
  const jsGated    = jsCalcMassingEnvelope(
    { sqft_lot: 7000 }, {}, { multifamily: false }, { units_max_any_path: null },
  ) as { data_basis: string; human_review_required: boolean; warnings: string[] }

  it('3. massing_envelope is NEVER labeled VERIFIED (TS populated)', () => {
    expect(tsPopulated.data_basis).not.toBe('VERIFIED')
    expect(tsPopulated.data_basis).toBe('RULE_BASED_ENVELOPE_ESTIMATE')
  })
  it('3. massing_envelope is NEVER labeled VERIFIED (TS gated)', () => {
    expect(tsGated.data_basis).not.toBe('VERIFIED')
    expect(tsGated.data_basis).toBe('NEEDS_INPUT')
  })
  it('3. massing_envelope is NEVER labeled VERIFIED (JS gated)', () => {
    expect(jsGated.data_basis).not.toBe('VERIFIED')
    expect(jsGated.data_basis).toBe('NEEDS_INPUT')
  })
  it('4. human_review_required is ALWAYS true (TS populated)', () => {
    expect(tsPopulated.human_review_required).toBe(true)
  })
  it('4. human_review_required is ALWAYS true (TS gated)', () => {
    expect(tsGated.human_review_required).toBe(true)
  })
  it('4. human_review_required is ALWAYS true (JS gated)', () => {
    expect(jsGated.human_review_required).toBe(true)
  })
  it('5. warnings include "preliminary" (TS populated)', () => {
    expect(tsPopulated.warnings.join(' ')).toMatch(/preliminary/i)
  })
  it('5. warnings include "not permit-ready" (TS populated)', () => {
    expect(tsPopulated.warnings.join(' ')).toMatch(/not permit-ready/i)
  })
  it('5. warnings include "preliminary" and "not permit-ready" (TS gated)', () => {
    const blob = tsGated.warnings.join(' ')
    expect(blob).toMatch(/preliminary/i)
    expect(blob).toMatch(/not permit-ready/i)
  })
  it('5. warnings include "preliminary" and "not permit-ready" (JS gated)', () => {
    const blob = jsGated.warnings.join(' ')
    expect(blob).toMatch(/preliminary/i)
    expect(blob).toMatch(/not permit-ready/i)
  })
})
