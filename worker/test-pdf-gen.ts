/**
 * Standalone PDF generation test.
 * Builds mock PropertyReport objects for two addresses and writes PDFs to disk.
 * Run via: node test-pdf-gen.cjs
 */
import { writeFileSync } from 'fs'
import { generatePDFReport } from './src/pdf-report'
import type { PropertyReport, DataPoint } from './src/orchestrator'
import type { EntitlementAnalysis, EntitlementPathway, StackedIncentive } from './src/entitlement'
import type { ProfitModel, SensitivityTable } from './src/profit-model'

// ─── Mock helpers ─────────────────────────────────────────────────────────────
function dp(value: unknown, status: DataPoint['status'] = 'VERIFIED', confidence = 88, source = 'Test'): DataPoint {
  return { value, confidence, freshness: '2026-05-21', source, status }
}
function inferred(value: unknown): DataPoint {
  return dp(value, 'INFERRED', 55, 'AI Estimate')
}
function unavailable(): DataPoint {
  return dp(null, 'UNAVAILABLE', 0, '-')
}

// ─── Mock EntitlementAnalysis ─────────────────────────────────────────────────
const mockPathways: EntitlementPathway[] = [
  {
    id: 'ed1',
    name: 'ED1 Streamlined (100% Affordable)',
    description: '100% affordable, ministerial approval',
    category: 'ministerial',
    timeline_months: { min: 2, max: 6 },
    max_units: 28,
    affordable_requirement_pct: 100,
    affordable_ami_limit: 80,
    parking_reduction: true,
    key_requirements: ['100% units affordable at ≤80% AMI', 'Minimum 5 units', 'No Planning Commission hearing'],
    risks: ['No market-rate revenue — must stack LIHTC/HOME', 'Best for affordable developers/non-profits'],
    citation: { source: "Mayor's Executive Directive 1 (2022)", section: 'ED1', url: 'https://clkrep.lacity.org/onlinedocs/2022/22-0905_misc_09-07-22.pdf' },
    speed_rank: 1, units_rank: 1, risk_rank: 2,
  },
  {
    id: 'toc',
    name: 'TOC Tier 3 Density Bonus',
    description: 'Transit Oriented Communities bonus units',
    category: 'by-right',
    timeline_months: { min: 6, max: 14 },
    max_units: 18,
    affordable_requirement_pct: 15,
    affordable_ami_limit: 60,
    parking_reduction: true,
    key_requirements: ['Within Tier 3 transit distance', 'No public hearing required', 'Parking reduction available (AB 2097)'],
    risks: ['Affordable units reduce market-rate revenue', 'TOC design standards review'],
    citation: { source: 'LAMC', section: '12.22 A.31', url: 'https://planning.lacity.gov/plans-policies/transit-oriented-communities-incentive-program' },
    speed_rank: 2, units_rank: 2, risk_rank: 1,
  },
  {
    id: 'by-right',
    name: 'Standard By-Right Development',
    description: 'Standard zoning, no bonuses',
    category: 'by-right',
    timeline_months: { min: 8, max: 14 },
    max_units: 10,
    affordable_requirement_pct: 0,
    affordable_ami_limit: 0,
    parking_reduction: false,
    key_requirements: ['Comply with current zoning (FAR, height, setbacks)', 'LADBS plan check only', 'No affordable units required'],
    risks: ['Units capped at base zoning', 'Full parking requirements apply'],
    citation: { source: 'LAMC', section: 'Title 12', url: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-1' },
    speed_rank: 3, units_rank: 3, risk_rank: 1,
  },
]

const mockStackedIncentives: StackedIncentive[] = [
  {
    program: 'LIHTC (4% or 9%)',
    type: 'Federal',
    description: 'Federal tax credits stacked with TOC affordable units',
    estimated_subsidy_per_unit: 85000,
    stacks_with: ['TOC', 'HOME', 'AHSC'],
    affordable_requirement: '30–80% AMI depending on credit type',
    citation: { source: 'IRC', section: '§ 42', url: 'https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/low-income-housing-tax-credit' },
  },
  {
    program: 'HOME Investment Partnerships',
    type: 'Federal',
    description: 'HUD HOME funds for affordable rental, stackable with ED1',
    estimated_subsidy_per_unit: 60000,
    stacks_with: ['ED1', 'LIHTC'],
    affordable_requirement: '≤80% AMI',
    citation: { source: '42 U.S.C.', section: '§ 12701', url: 'https://www.hud.gov/program_offices/comm_planning/home' },
  },
]

const mockEntitlementAnalysis: EntitlementAnalysis = {
  pathways: mockPathways,
  fastest_path: mockPathways[0],
  most_units_path: mockPathways[0],
  lowest_risk_path: mockPathways[1],
  recommended_path: mockPathways[0],
  by_right_eligible: true,
  streamlined_eligible: true,
  discretionary_required: false,
  estimated_timeline_months: { min: 2, max: 6 },
  estimated_permit_fees: 42000,
  entitlement_risk_score: 4,
  stacked_incentives: mockStackedIncentives,
  max_stacked_subsidy_per_unit: 145000,
  citations: [
    { source: "Mayor's Executive Directive 1", section: 'ED1 (2022)', url: 'https://clkrep.lacity.org/onlinedocs/2022/22-0905_misc_09-07-22.pdf' },
    { source: 'LAMC', section: '12.22 A.31', url: 'https://planning.lacity.gov/plans-policies/transit-oriented-communities-incentive-program' },
  ],
  zone: 'RD1.5-1XL',
  toc_tier: 3,
  lot_size_sf: 6750,
  units_by_right: 10,
  units_toc_bonus: 8,
  units_max_any_path: 28,
  data_basis: 'RULE_BASED — computed from zoning/statute logic and available parcel inputs; eligibility flags only, not final legal determination.',
  human_review_required: false,
}

// ─── Mock ProfitModel ─────────────────────────────────────────────────────────
const mockSensitivity: SensitivityTable = {
  rows: [
    { label: 'Worst Case',   rent_change_pct: -10, construction_change_pct: +10, irr_levered: -8.2,  irr_unlevered: 2.1,  equity_multiple: 0.72, max_land_price: 0 },
    { label: 'Stress',       rent_change_pct: -5,  construction_change_pct: +5,  irr_levered: 6.4,   irr_unlevered: 5.8,  equity_multiple: 1.22, max_land_price: 185000 },
    { label: 'Base Case',    rent_change_pct: 0,   construction_change_pct: 0,   irr_levered: 14.2,  irr_unlevered: 8.9,  equity_multiple: 1.68, max_land_price: 340000 },
    { label: 'Upside',       rent_change_pct: +5,  construction_change_pct: -5,  irr_levered: 21.8,  irr_unlevered: 12.4, equity_multiple: 2.14, max_land_price: 510000 },
    { label: 'Best Case',    rent_change_pct: +10, construction_change_pct: -10, irr_levered: 29.5,  irr_unlevered: 16.1, equity_multiple: 2.62, max_land_price: 720000 },
  ],
}

const mockProfitModel: ProfitModel & Record<string, unknown> = {
  // inputs
  land_price: 700000,
  buildable_units: 28,
  avg_unit_size_sf: 820,
  construction_type: 'Type V',
  avg_rent_per_unit_mo: 2800,
  // cost stack
  hard_costs_per_sf: 275,
  gross_building_area_sf: 22960,
  hard_costs_total: 6314000,
  soft_costs_pct: 20,
  soft_costs_total: 1262800,
  permit_fees: 42000,
  developer_fee: 341334,
  contingency: 357680,
  total_development_cost: 9017814,
  cost_per_unit: 322065,
  cost_per_sf: 392,
  // revenue
  gross_annual_income: 940800,
  vacancy_loss: 47040,
  effective_gross_income: 893760,
  operating_expenses: 312816,
  net_operating_income: 580944,
  // exit
  cap_rate_exit: 4.5,
  exit_value: 12909867,
  exit_price_per_unit: 461067,
  // financing
  ltc_pct: 65,
  debt_amount: 5861579,
  equity_required: 3156235,
  annual_debt_service: 442248,
  // returns — GATED: land_price_provided=false in orchestrator → IRR/max-land suppressed
  irr_unlevered: 8.9,
  irr_levered: null,
  equity_multiple: 1.68,
  cash_on_cash_yr1: 4.39,
  levered_profit: 2141040,
  // max offer (gated)
  target_irr: 20,
  max_land_price_at_target_irr: null,
  max_land_price_per_unit: null,
  max_land_pct_of_tdc: 5.2,
  // sensitivity
  sensitivity: mockSensitivity,
  // meta
  confidence: 'LOW',
  assumptions_note: 'Type V @ $275/sf (LA 2025/2026) | Rent $2,800/unit/mo (verify with broker) | 65% LTC @ 6.5% / 30yr | Exit 4.5% cap after 5-year hold',
  deal_signal: 'NEEDS_INPUT',
  deal_signal_reason: 'User-provided land price required before IRR, deal signal, or max land price can be calculated.',
  warning: 'User-provided land price required before IRR, deal signal, or max land price can be calculated.',
  // new provenance fields
  data_basis: 'MODEL_ESTIMATE — based on default assumptions; not verified bids, appraisal, lender quote, or final underwriting.',
  human_review_required: true,
  development_note: null,   // gated — narrative requires user-provided land price
}

// ─── Source registry mock ─────────────────────────────────────────────────────
const mockSources = [
  { source_name: 'LA City ZIMAS',        classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 95, machine_readable: true,  source_url: 'https://maps.lacity.org', notes: 'Live GIS query' },
  { source_name: 'LA County Assessor',   classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 90, machine_readable: true,  source_url: 'https://assessor.lacounty.gov', notes: 'APN match confirmed' },
  { source_name: 'LADBS Permits',        classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 88, machine_readable: true,  source_url: 'https://data.lacity.org', notes: 'Permit history returned' },
  { source_name: 'LADBS Violations',     classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 88, machine_readable: true,  source_url: 'https://data.lacity.org', notes: 'No active violations' },
  { source_name: 'FEMA NFHL',            classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 92, machine_readable: true,  source_url: 'https://hazards.fema.gov', notes: 'Zone X — minimal flood' },
  { source_name: 'CalFire FHSZ',         classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 90, machine_readable: true,  source_url: 'https://services1.arcgis.com', notes: 'Moderate fire zone' },
  { source_name: 'US Census ACS5',       classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 85, machine_readable: true,  source_url: 'https://api.censusreporter.org', notes: 'Tract-level income/burden' },
  { source_name: 'LA City TOC Tiers',    classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 95, machine_readable: true,  source_url: 'https://services1.arcgis.com', notes: 'Tier 3 confirmed' },
  { source_name: 'USGS Seismic',         classification: 'PUBLIC_RECORD',    status: 'VERIFIED',   confidence: 88, machine_readable: true,  source_url: 'https://earthquake.usgs.gov', notes: 'Ss=1.82, S1=0.65' },
  { source_name: 'MLS Comparables',      classification: 'API_AVAILABLE_BUT_SUBSCRIPTION_REQUIRED', status: 'UNAVAILABLE', confidence: 0, machine_readable: false, source_url: 'https://www.crmls.org', notes: 'MLS subscription required — suppressed per Phase 0' },
  { source_name: 'CoStar',               classification: 'PAID_PORTAL',      status: 'NEEDS_HUMAN_REVIEW', confidence: 0, machine_readable: false, source_url: 'https://www.costar.com', notes: 'Paid portal — manual lookup required', fallback_behavior: 'Manual verification required' },
]

// ─── Base report builder ──────────────────────────────────────────────────────
function buildReport(
  street: string,
  city: string,
  zip: string,
  apn: string,
  humanReview: boolean,
): PropertyReport {
  return {
    request_id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    address: {
      full_address: `${street}, ${city}, CA ${zip}`,
      street,
      city,
      state: 'CA',
      zip_code: zip,
      apn,
      lat: 34.02,
      lng: -118.44,
    },
    tier: 'developer',
    generated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    generation_time_seconds: 12.4,
    deal_score: 'B',
    deal_score_rationale: 'Moderate feasibility — ED1 pathway viable; market-rate pro forma below target IRR at asking price',
    overall_confidence: 84,
    data_freshness_summary: 'VERIFIED: 9 sources live as of report date. MLS suppressed. CoStar manual review required.',
    zoning: {
      zoning_code:         dp('RD1.5-1XL'),
      permitted_uses:      dp('Residential — Low Medium Density'),
      max_far:             dp('1.5'),
      height_limit_ft:     dp('45'),
      toc_tier:            dp('3'),
      ed1_eligible:        dp('true'),
      ab2011_eligible:     dp('false'),
      rso_covered:         dp('false'),
      ladbs_violations:    dp('0 active violations'),
      buildable_sf:        dp('10125'),
      max_units_by_right:  dp('10'),
      max_units_toc:       dp('18'),
      confidence_overall:  88,
    },
    valuation: {
      legal_value:              dp('$1,250,000', 'VERIFIED', 82),
      climate_adjusted_value:   inferred('$1,190,000'),
      xgboost_estimate:         inferred('$1,310,000'),
      lightgbm_estimate:        inferred('$1,280,000'),
      catboost_estimate:        inferred('$1,295,000'),
      ensemble_estimate:        inferred('$1,295,000'),
      cap_rate:                 dp('4.8%'),
      price_per_unit:           dp('$125,000'),
      confidence_overall:       72,
    },
    distress: {
      distress_score:          dp('22', 'VERIFIED', 88, 'SevenNova Model'),
      dscr_estimate:           inferred('1.12'),
      loan_maturity_risk:      dp('LOW', 'VERIFIED', 80),
      ladbs_order_active:      dp('false'),
      entity_stress_signals:   dp('None detected'),
    },
    climate: {
      flood_risk_score:        dp('Zone X — Minimal', 'VERIFIED', 92, 'FEMA NFHL'),
      wildfire_risk_score:     dp('Moderate — LRA', 'VERIFIED', 90, 'CalFire 2023'),
      seismic_risk_score:      dp('High (Ss=1.82, S1=0.65)', 'VERIFIED', 88, 'USGS ASCE 7-22'),
      heat_risk_score:         dp('6/10', 'VERIFIED', 82),
      insurance_stress_score:  inferred('7/10 — elevated wildfire/seismic'),
      climate_haircut_pct:     inferred('4.8%'),
    },
    entitlement: {
      best_pathway:            dp('ED1 Streamlined (100% Affordable)', 'VERIFIED', 90, 'LAMC 12.22 A.31 / ED1'),
      approval_probability:    inferred('85%'),
      timeline_months:         dp('2–6 months (ED1 ministerial)', 'VERIFIED', 85),
      jurisdiction_risk:       dp('LOW — ministerial pathway available'),
      irr_impact_pct:          inferred('-3.2%'),
      carry_cost_monthly:      inferred('$18,400'),
    },
    entitlement_detailed: {
      ...mockEntitlementAnalysis,
      human_review_required: humanReview,
    },
    profit_model_data: {
      ...mockProfitModel,
      human_review_required: humanReview,
    } as Parameters<typeof generatePDFReport>[0]['profit_model_data'],
    executive_summary:
      `Parcel is in Beverlywood, TOC Tier 3. The site is eligible for ED1 streamlined ministerial approval (100% affordable) ` +
      `with a 2–6 month timeline, and TOC by-right development as an alternative. Pro forma economics (IRR, deal signal, ` +
      `max supportable land price) are gated pending user-provided land price, rent, and cost assumptions. ` +
      `No active LADBS violations. Moderate seismic and wildfire exposure. RECOMMENDED next step: pursue ED1 pathway with LIHTC advisor.`,
    investment_thesis:
      `Beverlywood infill site with strong entitlement optionality. ED1 ministerial pathway removes discretionary risk entirely — ` +
      `no Planning Commission hearing, 2–6 month approval timeline. TOC Tier 3 by-right alternative available for mixed-income strategy. ` +
      `Returns and max land basis require user-provided assumptions.`,
    risk_summary:
      `Seismic exposure increases hard cost contingency. Wildfire insurance stress moderate but manageable. ` +
      `ED1 pathway requires 100% affordable — limits market-rate upside. No MLS comparable data included. ` +
      `IRR/land-basis claims suppressed pending verified user inputs.`,
    strategic_recommendations: [
      'Engage LIHTC syndicator early to evaluate ED1 + LIHTC + AHSC stack',
      'Order Phase I ESA — seismic zone mandates soils report before permit',
      'Confirm TOC Tier 3 status with LADCP Planning — verify buffer radius from nearest qualifying transit stop',
      'Engage licensed land use attorney for ED1 application — ministerial but requires specific compliance package',
      'Provide verified land price, rent, and cost inputs to unlock IRR, deal signal, and max land price',
    ],
    red_flags: [
      'NEEDS_INPUT: Pro forma IRR, deal signal, and max land price require user-provided land price and assumptions',
      'SEISMIC: High seismic zone — soils report and structural engineering required',
      'MODEL ESTIMATE: Pro forma uses default assumptions — replace with actual bids before any commitment',
    ],
    skills_activated: [
      { skill_name: 'LA Developer Intelligence',   activated: true,  confidence: 90, data_freshness: 'LIVE' },
      { skill_name: 'Entitlement Pathway Engine',  activated: true,  confidence: 88, data_freshness: 'LIVE' },
      { skill_name: 'Developer Pro Forma',         activated: true,  confidence: 72, data_freshness: 'MODEL_ESTIMATE' },
      { skill_name: 'Climate Risk Engine',         activated: true,  confidence: 85, data_freshness: 'LIVE' },
      { skill_name: 'LADBS Violation Scanner',     activated: true,  confidence: 88, data_freshness: 'LIVE' },
      { skill_name: 'Distressed Debt Radar',       activated: true,  confidence: 80, data_freshness: 'LIVE' },
      { skill_name: 'Ensemble Pricing Engine',     activated: true,  confidence: 72, data_freshness: 'INFERRED' },
      { skill_name: 'MLS Comparables',             activated: false, confidence: 0,  data_freshness: 'SUPPRESSED', error: 'MLS subscription required — Phase 0 suppressed' },
    ],
    assumptions: [
      'Construction: Type V @ $275/sf (LA 2025/2026 RSMeans estimate)',
      'Rent: $2,800/unit/mo — verify with local broker',
      '65% LTC @ 6.5% / 30yr',
      'Exit: 4.5% cap rate after 5-year hold',
    ],
    unverified_items: [
      'IRR and carry cost (model estimates — not verified against primary source)',
      'Ensemble valuation (AI estimate — MLS comps required for verification)',
      'Climate haircut % (AI estimate — insurance quotes required)',
    ],
    disclaimer:
      'This report is a preliminary feasibility analysis generated by SevenNova.ai for informational purposes only. ' +
      'It does not constitute a licensed real estate appraisal, broker price opinion, legal opinion, architectural opinion, ' +
      'or permit approval guarantee. All figures are estimates. Verify all data with the City of Los Angeles Planning ' +
      'Department, LADBS, and licensed professionals before any acquisition, lending, or investment decision.',
    cache_hit: false,
    source_registry: mockSources as Parameters<typeof generatePDFReport>[0]['source_registry'],
    manual_review_required: humanReview,
  } as PropertyReport
}

// ─── Generate both reports ────────────────────────────────────────────────────
async function main() {
  const reports = [
    { street: '9432 Oakmore Rd', city: 'Los Angeles', zip: '90035', apn: '4319-008-019', filename: 'test-oakmore.pdf', humanReview: false },
    { street: '904 S Ardmore Ave', city: 'Los Angeles', zip: '90006', apn: '5110-011-002', filename: 'test-ardmore.pdf', humanReview: true },
  ]

  for (const r of reports) {
    console.log(`Generating PDF for ${r.street}...`)
    const report = buildReport(r.street, r.city, r.zip, r.apn, r.humanReview)
    const bytes = await generatePDFReport(report, 'test-key-xxxx', undefined)
    writeFileSync(r.filename, bytes)
    console.log(`  Written: ${r.filename} (${bytes.byteLength.toLocaleString()} bytes)`)
  }

  console.log('\nDone. Open test-oakmore.pdf and test-ardmore.pdf to inspect layout.')
}

main().catch(err => { console.error(err); process.exit(1) })
