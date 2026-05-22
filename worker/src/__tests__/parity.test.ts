// Parity test: JS profit engine (functions/api/zoning.js, live /api/zoning)
// vs TS profit engine (worker/src/profit-model.ts, orchestrator + PDF path).
// Feeds identical inputs and asserts the two engines agree within tolerance.
// Live JS baseline captured from https://sevennova.ai/api/zoning for 904 S Ardmore Ave.

import { describe, it, expect } from 'vitest'
import { runProfitModel } from '../profit-model'

// ── Baseline: live JS /api/zoning profit_model output (Ardmore, captured 2026-05-22) ──
const JS_LIVE = {
  units_modeled: 5,
  land_price_used: 469100,
  avg_rent_per_unit_mo: 2800,
  construction_type: 'Type V' as const,
  permit_fees: 14500,
  gba_sf: 4250,           // 5 units * 850 sf
  target_irr: 20,
  // outputs to compare
  tdc: 2000638,
  hard_costs: 1168750,
  soft_costs: 233750,
  noi: 103740,
  exit_value: 2305333,
  irr_levered: 8.13,
  irr_unlevered: 7.79,
  equity_multiple: 2.47,
  max_land_price_at_target_irr: 98000,
  deal_signal: 'NO-GO',
}

describe('JS↔TS profit-model parity (Ardmore live baseline)', () => {
  const ts = runProfitModel({
    land_price: JS_LIVE.land_price_used,
    land_price_provided: true,  // validate the underlying math (gate suppresses outputs separately)
    buildable_units: JS_LIVE.units_modeled,
    avg_unit_size_sf: JS_LIVE.gba_sf / JS_LIVE.units_modeled,  // 850
    construction_type: JS_LIVE.construction_type,
    avg_rent_per_unit_mo: JS_LIVE.avg_rent_per_unit_mo,
    permit_fees: JS_LIVE.permit_fees,
    target_irr: JS_LIVE.target_irr,
    // defaults: vacancy 5%, opex 35%, cap 4.5%, ltc 65%, interest 6.5%, term 30, holding 5
  })

  it('insufficient-data early-exit: zero units returns safe gated shape with note', () => {
    const out = runProfitModel({ land_price: 500_000, buildable_units: 0 })
    expect(out.note).toContain('Insufficient parcel data')
    expect(out.irr_levered).toBeNull()
    expect(out.max_land_price_at_target_irr).toBeNull()
    expect(out.max_land_price_per_unit).toBeNull()
    expect(out.deal_signal).toBe('NEEDS_INPUT')
    expect(out.human_review_required).toBe(true)
    expect(out.data_basis).toMatch(/MODEL_ESTIMATE/)
    expect(out.warning).toContain('User/professional verification required')
  })
  it('insufficient-data early-exit: zero land price returns safe gated shape with note', () => {
    const out = runProfitModel({ land_price: 0, buildable_units: 10 })
    expect(out.note).toContain('Land price unavailable')
    expect(out.irr_levered).toBeNull()
    expect(out.deal_signal).toBe('NEEDS_INPUT')
    expect(out.human_review_required).toBe(true)
    expect(out.warning).toContain('User/professional verification required')
  })

  it('finance gate: outputs suppressed when land price NOT provided', () => {
    const gated = runProfitModel({
      land_price: JS_LIVE.land_price_used,
      buildable_units: JS_LIVE.units_modeled,
      avg_unit_size_sf: JS_LIVE.gba_sf / JS_LIVE.units_modeled,
    })
    expect(gated.irr_levered).toBeNull()
    expect(gated.max_land_price_at_target_irr).toBeNull()
    expect(gated.deal_signal).toBe('NEEDS_INPUT')
    expect(gated.human_review_required).toBe(true)
    expect(gated.warning).toContain('User-provided land price required')
  })

  const pct = (a: number, b: number) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b))

  it('hard costs match (deterministic, exact)', () => {
    expect(ts.hard_costs_total).toBe(JS_LIVE.hard_costs)
  })
  it('soft costs match (deterministic, exact)', () => {
    expect(ts.soft_costs_total).toBe(JS_LIVE.soft_costs)
  })
  it('total development cost within 1%', () => {
    expect(pct(ts.total_development_cost, JS_LIVE.tdc)).toBeLessThan(0.01)
  })
  it('NOI within 1%', () => {
    expect(pct(ts.net_operating_income, JS_LIVE.noi)).toBeLessThan(0.01)
  })
  it('exit value within 1%', () => {
    expect(pct(ts.exit_value, JS_LIVE.exit_value)).toBeLessThan(0.01)
  })
  it('levered IRR within 0.5 pts', () => {
    expect(ts.irr_levered).not.toBeNull()
    expect(Math.abs((ts.irr_levered as number) - JS_LIVE.irr_levered)).toBeLessThan(0.5)
  })
  it('unlevered IRR within 0.5 pts', () => {
    expect(Math.abs(ts.irr_unlevered - JS_LIVE.irr_unlevered)).toBeLessThan(0.5)
  })
  it('equity multiple within 0.1x', () => {
    expect(Math.abs(ts.equity_multiple - JS_LIVE.equity_multiple)).toBeLessThan(0.1)
  })
  it('max supportable land price within 5%', () => {
    expect(ts.max_land_price_at_target_irr).not.toBeNull()
    expect(pct(ts.max_land_price_at_target_irr as number, JS_LIVE.max_land_price_at_target_irr)).toBeLessThan(0.05)
  })
  it('deal signal matches', () => {
    expect(ts.deal_signal).toBe(JS_LIVE.deal_signal)
  })
})
