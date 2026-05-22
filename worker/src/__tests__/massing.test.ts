// massing.test.ts — Phase 5A
// Pure deterministic math tests. No live calls, no env, no AI.

import { describe, it, expect } from 'vitest'
import { computeMassing } from '../massing'

describe('computeMassing — required-input gate', () => {
  it('returns NEEDS_INPUT when lot_size_sf missing', () => {
    const r = computeMassing({ max_far: 1.5, height_limit_ft: 45 })
    expect(r.status).toBe('NEEDS_INPUT')
    expect(r.data_basis).toBe('NEEDS_INPUT')
    expect(r.missing_inputs).toContain('lot_size_sf')
    expect(r.floors_estimated).toBeNull()
    expect(r.floor_plate_sf_estimated).toBeNull()
    expect(r.gross_building_area_sf_estimated).toBeNull()
    expect(r.far_utilization_pct).toBeNull()
    expect(r.height_compliance).toBe('NEEDS_INPUT')
    expect(r.simple_geometry).toBeNull()
    expect(r.human_review_required).toBe(true)
  })
  it('returns NEEDS_INPUT when max_far missing', () => {
    const r = computeMassing({ lot_size_sf: 7000, height_limit_ft: 45 })
    expect(r.status).toBe('NEEDS_INPUT')
    expect(r.missing_inputs).toContain('max_far')
  })
  it('returns NEEDS_INPUT when height_limit_ft missing', () => {
    const r = computeMassing({ lot_size_sf: 7000, max_far: 1.5 })
    expect(r.status).toBe('NEEDS_INPUT')
    expect(r.missing_inputs).toContain('height_limit_ft')
  })
  it('returns NEEDS_INPUT listing ALL missing inputs', () => {
    const r = computeMassing({})
    expect(r.missing_inputs.sort()).toEqual(['height_limit_ft', 'lot_size_sf', 'max_far'])
  })
  it('lot_size_sf = 0 is treated as missing', () => {
    const r = computeMassing({ lot_size_sf: 0, max_far: 1.5, height_limit_ft: 45 })
    expect(r.status).toBe('NEEDS_INPUT')
    expect(r.missing_inputs).toContain('lot_size_sf')
  })
})

describe('computeMassing — happy path (FAR binding)', () => {
  // 7,000 sf lot, FAR 3.0, height 75 ft, 10 ft floor-to-floor (default)
  // FAR-allowed GBA = 21,000 sf
  // No setbacks → floor plate = full lot ≈ 7,000 sf (using square approximation)
  // Height allows max 7 floors; FAR needs 3 floors → 3 floors binds.
  const r = computeMassing({ lot_size_sf: 7000, max_far: 3.0, height_limit_ft: 75 })

  it('status OK and data_basis RULE_BASED_ENVELOPE_ESTIMATE', () => {
    expect(r.status).toBe('OK')
    expect(r.data_basis).toBe('RULE_BASED_ENVELOPE_ESTIMATE')
    expect(r.human_review_required).toBe(true)
  })
  it('floors estimated = 3 (FAR binds before height)', () => {
    expect(r.floors_estimated).toBe(3)
  })
  it('floor plate ≈ lot size (square approximation, no setbacks)', () => {
    expect(r.floor_plate_sf_estimated).toBe(7000)
  })
  it('GBA ≈ 21,000 sf (FAR cap)', () => {
    expect(r.gross_building_area_sf_estimated).toBe(21000)
  })
  it('FAR utilization ~100%', () => {
    expect(r.far_utilization_pct).toBeGreaterThanOrEqual(99)
    expect(r.far_utilization_pct).toBeLessThanOrEqual(100.1)
  })
  it('height compliance WITHIN_LIMIT', () => {
    expect(r.height_compliance).toBe('WITHIN_LIMIT')
  })
  it('warnings include disclaimer about not-architectural / not-permit-ready', () => {
    expect(r.warnings.join(' ')).toMatch(/not architectural design/i)
    expect(r.warnings.join(' ')).toMatch(/not permit-ready/i)
  })
  it('emits simple_geometry with lot + building boxes', () => {
    expect(r.simple_geometry).not.toBeNull()
    expect(r.simple_geometry!.lot.width_ft).toBeGreaterThan(0)
    expect(r.simple_geometry!.building.floors).toBe(3)
    expect(r.simple_geometry!.building.height_ft).toBe(30)
    expect(r.simple_geometry!.origin).toEqual({ x: 0, y: 0, z: 0 })
  })
  it('missing_inputs is empty', () => {
    expect(r.missing_inputs).toEqual([])
  })
})

describe('computeMassing — height-binding case', () => {
  // FAR is generous, height limits the build
  // 5,000 sf lot, FAR 5.0 (25,000 sf allowed), height 30 ft = 3 floors at 10 ft each
  // 3 floors × 5,000 = 15,000 GBA (well under FAR cap)
  const r = computeMassing({ lot_size_sf: 5000, max_far: 5.0, height_limit_ft: 30 })

  it('floors capped at 3 by height', () => {
    expect(r.floors_estimated).toBe(3)
  })
  it('GBA = floors × floor plate (height-limited, under FAR)', () => {
    expect(r.gross_building_area_sf_estimated).toBe(15000)
  })
  it('FAR utilization < 100%', () => {
    expect(r.far_utilization_pct).toBeLessThan(100)
  })
})

describe('computeMassing — setbacks reduce floor plate', () => {
  // 100 ft × 100 ft lot (10,000 sf), setbacks 10 ft front/rear, 5 ft each side
  // Usable = 90 ft × 80 ft = 7,200 sf
  const r = computeMassing({
    lot_size_sf: 10_000,
    lot_dimensions: { width_ft: 100, depth_ft: 100 },
    max_far: 2.0,
    height_limit_ft: 45,
    setbacks: { front_ft: 10, rear_ft: 10, side_ft: 5 },
  })

  it('floor plate reduced to 7,200 sf', () => {
    expect(r.floor_plate_sf_estimated).toBe(7200)
  })
  it('building geometry uses setback origin', () => {
    expect(r.simple_geometry!.building.width_ft).toBe(90)
    expect(r.simple_geometry!.building.depth_ft).toBe(80)
    expect(r.simple_geometry!.origin).toEqual({ x: 5, y: 10, z: 0 })
  })
  it('inputs_echo records applied setbacks', () => {
    expect(r.inputs_echo.setbacks_applied).toEqual({ front_ft: 10, rear_ft: 10, side_ft: 5 })
  })
})

describe('computeMassing — setbacks consume full lot', () => {
  // 50 ft × 50 ft lot, side setback 30 ft (60 ft total > 50 width) → usable width = 0
  const r = computeMassing({
    lot_size_sf: 2500,
    lot_dimensions: { width_ft: 50, depth_ft: 50 },
    max_far: 1.0,
    height_limit_ft: 30,
    setbacks: { side_ft: 30 },
  })

  it('floor plate reduces to 0', () => {
    expect(r.floor_plate_sf_estimated).toBe(0)
  })
  it('floors reduces to 0', () => {
    expect(r.floors_estimated).toBe(0)
  })
  it('GBA = 0', () => {
    expect(r.gross_building_area_sf_estimated).toBe(0)
  })
  it('warning emitted about zero floor plate', () => {
    expect(r.warnings.join(' ')).toMatch(/floor plate reduces to zero/i)
  })
})

describe('computeMassing — square-lot fallback when dimensions absent', () => {
  // 7,000 sf lot, no dimensions provided → side ≈ √7000 ≈ 83.66 ft
  const r = computeMassing({ lot_size_sf: 7000, max_far: 1.5, height_limit_ft: 45 })

  it('emits square-lot approximation warning', () => {
    expect(r.warnings.join(' ')).toMatch(/square-lot approximation/i)
  })
  it('geometry lot is square-ish', () => {
    expect(r.simple_geometry!.lot.width_ft).toBeCloseTo(Math.sqrt(7000), 1)
    expect(r.simple_geometry!.lot.depth_ft).toBeCloseTo(Math.sqrt(7000), 1)
  })
})

describe('computeMassing — units_max sanity check', () => {
  // Small lot but entitlement allows 30 units — should warn envelope can't fit
  const r = computeMassing({
    lot_size_sf: 5000,
    max_far: 2.0,
    height_limit_ft: 45,
    units_max: 30,
  })

  it('warns when envelope unit capacity < entitlement maximum', () => {
    expect(r.warnings.join(' ')).toMatch(/entitlement permits up to 30/i)
  })

  // Now with generous envelope that easily fits the units → no unit-capacity warning
  const r2 = computeMassing({
    lot_size_sf: 50_000,
    max_far: 3.0,
    height_limit_ft: 75,
    units_max: 10,
  })
  it('no unit-capacity warning when envelope supports entitlement maximum', () => {
    expect(r2.warnings.join(' ')).not.toMatch(/entitlement permits up to/i)
  })
})

describe('computeMassing — custom floor-to-floor', () => {
  // 45 ft height limit at 15 ft floor-to-floor = 3 floors (not 4)
  const r = computeMassing({
    lot_size_sf: 7000,
    max_far: 10.0,                 // ensure height binds
    height_limit_ft: 45,
    floor_to_floor_height_ft: 15,
  })
  it('floors derived from custom floor-to-floor', () => {
    expect(r.floors_estimated).toBe(3)
    expect(r.simple_geometry!.building.height_ft).toBe(45)
  })
})

describe('computeMassing — output safety contract', () => {
  const r = computeMassing({ lot_size_sf: 7000, max_far: 1.5, height_limit_ft: 45 })
  it('always sets human_review_required true', () => {
    expect(r.human_review_required).toBe(true)
  })
  it('data_basis never claims VERIFIED', () => {
    expect(['RULE_BASED_ENVELOPE_ESTIMATE', 'NEEDS_INPUT']).toContain(r.data_basis)
  })
  it('warnings always contain non-permit-ready language', () => {
    expect(r.warnings.length).toBeGreaterThan(0)
    expect(r.warnings.join(' ')).toMatch(/preliminary/i)
  })
})
