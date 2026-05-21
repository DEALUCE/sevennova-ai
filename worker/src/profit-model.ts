/**
 * SevenNova — Developer Profit Model
 *
 * Computes developer pro forma: construction costs, revenue, returns, and
 * backward-solves max land price at a target IRR.
 *
 * LA-specific cost benchmarks (2025/2026):
 *   Type V (wood frame, ≤4 stories):    ~$275/sf
 *   Type III (concrete/steel, 5-7 stories): ~$350/sf
 *   Type I (concrete, 8+ stories):      ~$500/sf
 *   Soft costs:                         20% of hard costs
 *   LA developer fee:                   typically 4-5% of TDC
 *
 * IRR model uses simplified cash flow:
 *   Year 0: land + hard + soft + permits + financing (equity portion)
 *   Years 1-N: stabilized NOI (net operating income)
 *   Exit: sale at cap rate
 */

export type ConstructionType = 'Type V' | 'Type III' | 'Type I'

export interface SensitivityRow {
  label: string
  rent_change_pct: number
  construction_change_pct: number
  irr_levered: number
  irr_unlevered: number
  equity_multiple: number
  max_land_price: number
}

export interface SensitivityTable {
  rows: SensitivityRow[]
}

export interface ProfitModelInput {
  // Required
  land_price: number
  buildable_units: number

  // Optional — defaults applied if not provided
  avg_unit_size_sf?: number          // default: 850 sf
  construction_type?: ConstructionType  // default: 'Type V'
  avg_rent_per_unit_mo?: number      // default: use HUD FMR 2br or $2,800
  vacancy_rate_pct?: number          // default: 5%
  operating_expense_ratio_pct?: number // default: 35%
  cap_rate_exit?: number             // default: 4.5%
  ltc_pct?: number                   // loan-to-cost, default: 65%
  interest_rate?: number             // default: 6.5%
  loan_term_years?: number           // default: 30
  construction_months?: number       // default: 18
  target_irr?: number                // default: 20% levered IRR for max land solve
  holding_years?: number             // default: 5 years then exit

  // From entitlement analysis
  permit_fees?: number               // default: estimate from units

  // Optional market data
  hud_fmr_2br?: number               // HUD fair market rent 2BR (from existing API)
}

export interface ProfitModel {
  // ── Inputs (with defaults applied) ────────────────────────────────────────
  land_price: number
  buildable_units: number
  avg_unit_size_sf: number
  construction_type: ConstructionType
  avg_rent_per_unit_mo: number

  // ── Construction cost stack ────────────────────────────────────────────────
  hard_costs_per_sf: number
  gross_building_area_sf: number
  hard_costs_total: number
  soft_costs_pct: number
  soft_costs_total: number
  permit_fees: number
  developer_fee: number
  contingency: number
  total_development_cost: number        // land + hard + soft + permit + dev_fee + contingency
  cost_per_unit: number
  cost_per_sf: number

  // ── Revenue model ──────────────────────────────────────────────────────────
  gross_annual_income: number
  vacancy_loss: number
  effective_gross_income: number
  operating_expenses: number
  net_operating_income: number

  // ── Exit value ─────────────────────────────────────────────────────────────
  cap_rate_exit: number
  exit_value: number
  exit_price_per_unit: number

  // ── Financing stack ────────────────────────────────────────────────────────
  ltc_pct: number
  debt_amount: number
  equity_required: number
  annual_debt_service: number

  // ── Returns ────────────────────────────────────────────────────────────────
  irr_unlevered: number
  irr_levered: number
  equity_multiple: number
  cash_on_cash_yr1: number
  levered_profit: number

  // ── Max offer price (backward-solve) ──────────────────────────────────────
  target_irr: number
  max_land_price_at_target_irr: number
  max_land_price_per_unit: number
  max_land_pct_of_tdc: number

  // ── Sensitivity table ──────────────────────────────────────────────────────
  sensitivity: SensitivityTable

  // ── Meta ───────────────────────────────────────────────────────────────────
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  assumptions_note: string
  deal_signal: 'GO' | 'BORDERLINE' | 'NO-GO'
  deal_signal_reason: string
}

// ─── Hard cost benchmarks by construction type ────────────────────────────────
const HARD_COST_PER_SF: Record<ConstructionType, number> = {
  'Type V': 275,    // wood frame ≤4 stories
  'Type III': 350,  // concrete/masonry 5-7 stories
  'Type I': 500,    // concrete tower 8+ stories
}

// ─── Simple IRR solver (Newton-Raphson on NPV) ───────────────────────────────
function computeIRR(cashFlows: number[]): number {
  let rate = 0.15  // initial guess
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0
    let dnpv = 0
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t)
      npv += cashFlows[t] / denom
      dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1)
    }
    if (Math.abs(npv) < 1) break
    if (Math.abs(dnpv) < 1e-10) break
    rate -= npv / dnpv
    if (rate < -0.99) rate = -0.99
    if (rate > 10) rate = 10
  }
  return Math.round(rate * 10000) / 100  // return as percentage, 2 decimal places
}

// ─── NPV at given rate ────────────────────────────────────────────────────────
function computeNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0)
}

// ─── Annual mortgage payment (P&I) ────────────────────────────────────────────
function annualMortgagePayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return principal / termYears
  const r = annualRate / 12
  const n = termYears * 12
  const monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return monthly * 12
}

// ─── Build cash flow array for IRR calculation ────────────────────────────────
function buildCashFlows(
  equity: number,
  noi: number,
  annualDebtService: number,
  exitValue: number,
  debtBalance: number,
  holdingYears: number,
): number[] {
  const flows: number[] = [-equity]  // Year 0: equity out
  const annualCashFlow = noi - annualDebtService
  for (let yr = 1; yr <= holdingYears; yr++) {
    if (yr < holdingYears) {
      flows.push(annualCashFlow)
    } else {
      // Exit year: cash flow + net sale proceeds
      const netSaleProceeds = exitValue - debtBalance
      flows.push(annualCashFlow + netSaleProceeds)
    }
  }
  return flows
}

// ─── Backward solve: max land price for target IRR ────────────────────────────
function solveMaxLandPrice(
  input: Required<ProfitModelInput>,
  targetIRR: number,
): number {
  // Binary search for max land price where levered IRR >= targetIRR
  let lo = 0
  let hi = input.land_price * 5  // generous upper bound
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const result = computeModel({ ...input, land_price: mid, target_irr: targetIRR })
    if (result.irr_levered >= targetIRR) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 100) break
  }
  return Math.round(lo / 1000) * 1000  // round to nearest $1K
}

// ─── Core model computation ───────────────────────────────────────────────────
function computeModel(input: Required<ProfitModelInput>): Omit<ProfitModel, 'sensitivity' | 'confidence' | 'assumptions_note' | 'deal_signal' | 'deal_signal_reason' | 'max_land_price_at_target_irr' | 'max_land_price_per_unit' | 'max_land_pct_of_tdc'> {
  const {
    land_price,
    buildable_units,
    avg_unit_size_sf,
    construction_type,
    avg_rent_per_unit_mo,
    vacancy_rate_pct,
    operating_expense_ratio_pct,
    cap_rate_exit,
    ltc_pct,
    interest_rate,
    loan_term_years,
    holding_years,
    permit_fees,
  } = input

  // Construction costs
  const hardCostPerSf = HARD_COST_PER_SF[construction_type]
  const gba = buildable_units * avg_unit_size_sf
  const hardCosts = gba * hardCostPerSf
  const softCostsPct = 0.20
  const softCosts = hardCosts * softCostsPct
  const devFee = (hardCosts + softCosts) * 0.04  // 4% developer fee
  const contingency = hardCosts * 0.05           // 5% contingency
  const tdc = land_price + hardCosts + softCosts + permit_fees + devFee + contingency

  // Revenue
  const gai = buildable_units * avg_rent_per_unit_mo * 12
  const vacancyLoss = gai * (vacancy_rate_pct / 100)
  const egi = gai - vacancyLoss
  const opex = egi * (operating_expense_ratio_pct / 100)
  const noi = egi - opex

  // Exit
  const exitValue = noi / (cap_rate_exit / 100)
  const exitPricePerUnit = exitValue / buildable_units

  // Financing
  const debtAmount = tdc * (ltc_pct / 100)
  const equity = tdc - debtAmount
  const annualDebt = annualMortgagePayment(debtAmount, interest_rate / 100, loan_term_years)

  // Unlevered cash flows (no debt)
  const unleveredFlows: number[] = [-tdc]
  for (let yr = 1; yr <= holding_years; yr++) {
    if (yr < holding_years) {
      unleveredFlows.push(noi)
    } else {
      unleveredFlows.push(noi + exitValue)
    }
  }
  const irrUnlevered = computeIRR(unleveredFlows)

  // Levered cash flows (with debt)
  const leveredFlows = buildCashFlows(equity, noi, annualDebt, exitValue, debtAmount, holding_years)
  const irrLevered = computeIRR(leveredFlows)

  // Equity multiple and cash-on-cash
  const annualLeveredCF = noi - annualDebt
  const cashOnCash = equity > 0 ? (annualLeveredCF / equity) * 100 : 0
  const totalLeveredReturn = leveredFlows.slice(1).reduce((s, v) => s + v, 0)
  const equityMultiple = equity > 0 ? (equity + totalLeveredReturn) / equity : 0

  return {
    land_price,
    buildable_units,
    avg_unit_size_sf,
    construction_type,
    avg_rent_per_unit_mo,
    hard_costs_per_sf: hardCostPerSf,
    gross_building_area_sf: gba,
    hard_costs_total: Math.round(hardCosts),
    soft_costs_pct: softCostsPct * 100,
    soft_costs_total: Math.round(softCosts),
    permit_fees: Math.round(permit_fees),
    developer_fee: Math.round(devFee),
    contingency: Math.round(contingency),
    total_development_cost: Math.round(tdc),
    cost_per_unit: Math.round(tdc / buildable_units),
    cost_per_sf: Math.round(tdc / gba),
    gross_annual_income: Math.round(gai),
    vacancy_loss: Math.round(vacancyLoss),
    effective_gross_income: Math.round(egi),
    operating_expenses: Math.round(opex),
    net_operating_income: Math.round(noi),
    cap_rate_exit,
    exit_value: Math.round(exitValue),
    exit_price_per_unit: Math.round(exitPricePerUnit),
    ltc_pct,
    debt_amount: Math.round(debtAmount),
    equity_required: Math.round(equity),
    annual_debt_service: Math.round(annualDebt),
    irr_unlevered: irrUnlevered,
    irr_levered: irrLevered,
    equity_multiple: Math.round(equityMultiple * 100) / 100,
    cash_on_cash_yr1: Math.round(cashOnCash * 100) / 100,
    levered_profit: Math.round(totalLeveredReturn),
    target_irr: input.target_irr,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function runProfitModel(raw: ProfitModelInput): ProfitModel {
  // Apply defaults
  const input: Required<ProfitModelInput> = {
    land_price: raw.land_price,
    buildable_units: raw.buildable_units,
    avg_unit_size_sf: raw.avg_unit_size_sf ?? 850,
    construction_type: raw.construction_type ?? 'Type V',
    avg_rent_per_unit_mo: raw.avg_rent_per_unit_mo ?? raw.hud_fmr_2br ?? 2_800,
    vacancy_rate_pct: raw.vacancy_rate_pct ?? 5,
    operating_expense_ratio_pct: raw.operating_expense_ratio_pct ?? 35,
    cap_rate_exit: raw.cap_rate_exit ?? 4.5,
    ltc_pct: raw.ltc_pct ?? 65,
    interest_rate: raw.interest_rate ?? 6.5,
    loan_term_years: raw.loan_term_years ?? 30,
    construction_months: raw.construction_months ?? 18,
    target_irr: raw.target_irr ?? 20,
    holding_years: raw.holding_years ?? 5,
    permit_fees: raw.permit_fees ?? (8_500 + raw.buildable_units * 1_500),
    hud_fmr_2br: raw.hud_fmr_2br ?? 0,
  }

  const base = computeModel(input)
  const maxLandPrice = solveMaxLandPrice(input, input.target_irr)

  // Sensitivity table: 3x3 matrix (±10% rent vs ±10% construction)
  const scenarios: Array<{ rent: number; construction: number; label: string }> = [
    { rent: -10, construction: +10, label: 'Worst Case' },
    { rent: 0,   construction: 0,   label: 'Base Case' },
    { rent: +10, construction: -10, label: 'Best Case' },
    { rent: -20, construction: +20, label: 'Stress' },
    { rent: +20, construction: -20, label: 'Upside' },
  ]

  const sensitivityRows: SensitivityRow[] = scenarios.map(s => {
    const adj: Required<ProfitModelInput> = {
      ...input,
      avg_rent_per_unit_mo: input.avg_rent_per_unit_mo * (1 + s.rent / 100),
    }
    // Adjust hard costs by modifying gross building area implicitly through a cost multiplier
    const costMultiplier = 1 + s.construction / 100
    const adjGBA = input.buildable_units * input.avg_unit_size_sf
    const adjHard = adjGBA * HARD_COST_PER_SF[input.construction_type] * costMultiplier
    const adjSoft = adjHard * 0.20
    const adjDevFee = (adjHard + adjSoft) * 0.04
    const adjContingency = adjHard * 0.05
    const adjTDC = input.land_price + adjHard + adjSoft + input.permit_fees + adjDevFee + adjContingency
    const adjGAI = input.buildable_units * adj.avg_rent_per_unit_mo * 12
    const adjVacancy = adjGAI * (input.vacancy_rate_pct / 100)
    const adjEGI = adjGAI - adjVacancy
    const adjNOI = adjEGI * (1 - input.operating_expense_ratio_pct / 100)
    const adjExit = adjNOI / (input.cap_rate_exit / 100)
    const adjDebt = adjTDC * (input.ltc_pct / 100)
    const adjEquity = adjTDC - adjDebt
    const adjAnnualDebt = annualMortgagePayment(adjDebt, input.interest_rate / 100, input.loan_term_years)
    const adjFlows = buildCashFlows(adjEquity, adjNOI, adjAnnualDebt, adjExit, adjDebt, input.holding_years)
    const adjUnleveredFlows: number[] = [-adjTDC]
    for (let yr = 1; yr <= input.holding_years; yr++) {
      if (yr < input.holding_years) adjUnleveredFlows.push(adjNOI)
      else adjUnleveredFlows.push(adjNOI + adjExit)
    }
    // Solve max land price for this scenario
    const adjMaxLand = solveMaxLandPrice({
      ...input,
      avg_rent_per_unit_mo: adj.avg_rent_per_unit_mo,
      permit_fees: input.permit_fees,
    }, input.target_irr)

    return {
      label: s.label,
      rent_change_pct: s.rent,
      construction_change_pct: s.construction,
      irr_levered: computeIRR(adjFlows),
      irr_unlevered: computeIRR(adjUnleveredFlows),
      equity_multiple: Math.round((adjEquity + adjFlows.slice(1).reduce((s, v) => s + v, 0)) / adjEquity * 100) / 100,
      max_land_price: adjMaxLand,
    }
  })

  // Confidence rating
  const hasMarketRent = !!raw.avg_rent_per_unit_mo || !!raw.hud_fmr_2br
  const hasPermitFees = !!raw.permit_fees
  const confidence: ProfitModel['confidence'] = (hasMarketRent && hasPermitFees) ? 'HIGH' : hasMarketRent ? 'MEDIUM' : 'LOW'

  // Deal signal
  let dealSignal: ProfitModel['deal_signal']
  let dealReason: string
  if (base.irr_levered >= input.target_irr && base.land_price <= maxLandPrice) {
    dealSignal = 'GO'
    dealReason = `Levered IRR ${base.irr_levered}% meets or exceeds ${input.target_irr}% target. Land price $${base.land_price.toLocaleString()} is at or below max of $${maxLandPrice.toLocaleString()}.`
  } else if (base.irr_levered >= input.target_irr * 0.8 || base.land_price <= maxLandPrice * 1.15) {
    dealSignal = 'BORDERLINE'
    dealReason = `Levered IRR ${base.irr_levered}% is below target ${input.target_irr}% or land price exceeds model max by less than 15%. Negotiate land price or optimize unit mix.`
  } else {
    dealSignal = 'NO-GO'
    dealReason = `Levered IRR ${base.irr_levered}% significantly below ${input.target_irr}% target. Land price $${base.land_price.toLocaleString()} exceeds max of $${maxLandPrice.toLocaleString()} by ${Math.round((base.land_price / maxLandPrice - 1) * 100)}%. Deal does not pencil at current asking price.`
  }

  const assumptionsNote = [
    `Construction: ${input.construction_type} @ $${HARD_COST_PER_SF[input.construction_type]}/sf (LA 2025/2026 RSMeans estimate)`,
    `Rent: $${input.avg_rent_per_unit_mo.toLocaleString()}/unit/mo${raw.hud_fmr_2br ? ' (HUD FMR 2BR)' : ' (market assumption — verify with broker)'}`,
    `Financing: ${input.ltc_pct}% LTC @ ${input.interest_rate}% rate, ${input.loan_term_years}yr term`,
    `Exit: ${input.cap_rate_exit}% cap rate after ${input.holding_years}-year hold`,
    `All costs are estimates — verify with licensed contractor and broker before committing.`,
  ].join(' | ')

  return {
    ...base,
    max_land_price_at_target_irr: maxLandPrice,
    max_land_price_per_unit: Math.round(maxLandPrice / input.buildable_units),
    max_land_pct_of_tdc: Math.round((maxLandPrice / base.total_development_cost) * 100 * 10) / 10,
    sensitivity: { rows: sensitivityRows },
    confidence,
    assumptions_note: assumptionsNote,
    deal_signal: dealSignal,
    deal_signal_reason: dealReason,
  }
}
