/**
 * SevenNova — Entitlement Analysis Engine
 *
 * Produces ranked pathway analysis for any LA parcel: fastest approval, most units,
 * lowest risk. Every conclusion cites exact LAMC section or state statute.
 *
 * Sources encoded:
 *   LAMC 12.22 A.25     — TOC Affordable Housing Incentive Program
 *   Mayor ED1 (2022)    — Executive Directive 1 (100% affordable, ministerial)
 *   Gov. Code 65913.4   — SB 35 (2017, streamlined ministerial approval)
 *   AB 2011 (2022)      — Affordable Housing and High Road Jobs Act
 *   Gov. Code 65852.21  — SB 9 (2021, lot split / urban lot split)
 *   Gov. Code 65852.2   — ADU/JADU statewide rules
 *   LAMC Title 12       — Standard zoning / density tables
 */

export interface Citation {
  source: string
  section: string
  url?: string
  note?: string
}

export interface StackedIncentive {
  program: string
  type: 'Federal' | 'State' | 'Local'
  description: string
  estimated_subsidy_per_unit?: number
  stacks_with: string[]
  affordable_requirement: string
  citation: Citation
}

export interface EntitlementPathway {
  id: string
  name: string
  description: string
  category: 'ministerial' | 'by-right' | 'streamlined' | 'discretionary' | 'administrative'
  timeline_months: { min: number; max: number }
  max_units: number
  affordable_requirement_pct: number
  affordable_ami_limit: number  // % AMI required for affordable units
  parking_reduction: boolean
  key_requirements: string[]
  risks: string[]
  citation: Citation
  speed_rank: number   // 1 = fastest
  units_rank: number   // 1 = most units
  risk_rank: number    // 1 = lowest risk
}

export interface EntitlementAnalysis {
  // Ranked pathways
  pathways: EntitlementPathway[]
  fastest_path: EntitlementPathway | null
  most_units_path: EntitlementPathway | null
  lowest_risk_path: EntitlementPathway | null
  recommended_path: EntitlementPathway | null

  // Summary
  by_right_eligible: boolean
  streamlined_eligible: boolean
  discretionary_required: boolean
  estimated_timeline_months: { min: number; max: number }
  estimated_permit_fees: number    // rough LA city fee estimate
  entitlement_risk_score: number   // 1-10 (10 = highest risk)

  // Incentive stacking
  stacked_incentives: StackedIncentive[]
  max_stacked_subsidy_per_unit: number

  // Citations
  citations: Citation[]

  // Meta
  zone: string
  toc_tier: number
  lot_size_sf: number
  units_by_right: number
  units_toc_bonus: number
  units_max_any_path: number
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface EntitlementInput {
  zone: string
  lot_size_sf: number
  toc_tier: number         // 0 = not in TOC, 1-4
  ed1_eligible: boolean
  sb9_eligible: boolean | null
  ab2011_eligible: boolean | null
  in_hpoz: boolean
  in_liquefaction_zone: boolean | null
  in_landslide_area: boolean | null
  units_by_right: number
  units_toc_bonus: number  // pre-computed from orchestrator
  census_median_income?: number   // for LIHTC/HOME qualification notes
  near_transit?: boolean
  community_plan_area?: string
}

// ─── LA-specific constants ─────────────────────────────────────────────────────

const LAMC_TOC_CITATION: Citation = {
  source: 'LAMC',
  section: '12.22 A.25',
  url: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-175046',
  note: 'Affordable Housing Incentive Program (TOC)',
}

const ED1_CITATION: Citation = {
  source: 'Mayor of Los Angeles',
  section: 'Executive Directive 1 (2022)',
  url: 'https://clkrep.lacity.org/onlinedocs/2022/22-0905_misc_09-07-22.pdf',
  note: '100% Affordable Housing Streamlined Approval',
}

const SB35_CITATION: Citation = {
  source: 'California Government Code',
  section: '§ 65913.4 (SB 35, 2017)',
  url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=65913.4.',
  note: 'Streamlined Ministerial Approval for infill housing',
}

const AB2011_CITATION: Citation = {
  source: 'California Health & Safety Code',
  section: '§ 65912.100 et seq. (AB 2011, 2022)',
  url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220AB2011',
  note: 'Affordable Housing and High Road Jobs Act — commercial corridor conversion',
}

const SB9_CITATION: Citation = {
  source: 'California Government Code',
  section: '§ 65852.21 (SB 9, 2021)',
  url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB9',
  note: 'Urban Lot Split and Two-Unit Development',
}

const ADU_CITATION: Citation = {
  source: 'California Government Code',
  section: '§ 65852.2 (ADU statewide rules)',
  url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=65852.2.',
  note: 'Accessory Dwelling Unit and Junior ADU rules',
}

const LAMC_DENSITY_CITATION: Citation = {
  source: 'LAMC',
  section: 'Title 12 — Zoning Regulations',
  url: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-161100',
  note: 'Standard density / by-right multifamily development',
}

const CUP_CITATION: Citation = {
  source: 'LAMC',
  section: '12.24 — Conditional Use Permits',
  url: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-175089',
  note: 'Discretionary approval through Planning Commission',
}

// ─── TOC fee estimate table ────────────────────────────────────────────────────
// LA City permit fees 2025: base plan check + permit + LADBS, rough estimate per unit
function estimatePermitFees(units: number, pathway: string): number {
  const base = 8_500  // minimum plan check + permit application
  const perUnit = pathway === 'ministerial' ? 1_200 : 2_500
  const envReview = pathway === 'discretionary' ? 35_000 : 0
  return Math.round(base + units * perUnit + envReview)
}

// ─── Core pathway builder ──────────────────────────────────────────────────────

export function analyzeEntitlement(input: EntitlementInput): EntitlementAnalysis {
  const {
    zone,
    lot_size_sf,
    toc_tier,
    ed1_eligible,
    sb9_eligible,
    ab2011_eligible,
    in_hpoz,
    in_liquefaction_zone,
    in_landslide_area,
    units_by_right,
    units_toc_bonus,
  } = input

  const z = (zone ?? '').toUpperCase().trim()
  const pathways: EntitlementPathway[] = []
  const stackedIncentives: StackedIncentive[] = []
  const citations: Citation[] = [LAMC_DENSITY_CITATION]

  const totalTocUnits = units_by_right + units_toc_bonus
  const highHazard = in_liquefaction_zone === true || in_landslide_area === true

  // ── Pathway 1: Standard By-Right ──────────────────────────────────────────
  if (units_by_right > 0) {
    pathways.push({
      id: 'by-right',
      name: 'Standard By-Right Development',
      description: `Build up to ${units_by_right} units as-of-right under current ${z} zoning. No discretionary hearing required.`,
      category: 'by-right',
      timeline_months: { min: 6, max: 14 },
      max_units: units_by_right,
      affordable_requirement_pct: 0,
      affordable_ami_limit: 0,
      parking_reduction: false,
      key_requirements: [
        'Comply with current zoning (height, FAR, setbacks, parking)',
        'LADBS plan check',
        'No affordable unit requirement',
      ],
      risks: [
        'No density bonus — units capped at base zoning',
        'Full parking requirements apply',
      ],
      citation: LAMC_DENSITY_CITATION,
      speed_rank: 2,
      units_rank: units_toc_bonus > 0 ? 3 : 2,
      risk_rank: 1,
    })
  }

  // ── Pathway 2: TOC By-Right (if in TOC area) ──────────────────────────────
  if (toc_tier >= 1 && toc_tier <= 4 && totalTocUnits > units_by_right) {
    const tocBonusPct = [0, 22.5, 32.5, 50, 80][toc_tier]
    const affordableReq = [0, 8, 11, 15, 20][toc_tier]
    citations.push(LAMC_TOC_CITATION)

    pathways.push({
      id: 'toc',
      name: `TOC Tier ${toc_tier} By-Right`,
      description: `Transit Oriented Communities Tier ${toc_tier} incentive: +${tocBonusPct}% unit bonus (${totalTocUnits} units) in exchange for ${affordableReq}% affordable units. Ministerial approval — no public hearing.`,
      category: 'ministerial',
      timeline_months: { min: 6, max: 14 },
      max_units: totalTocUnits,
      affordable_requirement_pct: affordableReq,
      affordable_ami_limit: 80,
      parking_reduction: true,
      key_requirements: [
        `${affordableReq}% of units affordable at ≤80% AMI for 55+ years`,
        `Within qualifying transit distance (Tier ${toc_tier})`,
        'Comply with TOC design standards',
        'No discretionary hearing required',
      ],
      risks: [
        'Affordable units required — reduces market-rate revenue',
        'Design standards may require additional architect review',
      ],
      citation: LAMC_TOC_CITATION,
      speed_rank: 2,
      units_rank: 2,
      risk_rank: 2,
    })

    // Stacked incentive: TOC + LIHTC
    stackedIncentives.push({
      program: 'LIHTC (4% or 9%)',
      type: 'Federal',
      description: 'Federal Low-Income Housing Tax Credits — can be stacked with TOC affordable units to fund construction of affordable portion',
      estimated_subsidy_per_unit: 85_000,
      stacks_with: ['TOC', 'HOME', 'AHSC'],
      affordable_requirement: `${affordableReq}% of units at ≤60% AMI`,
      citation: {
        source: 'IRC § 42',
        section: '26 U.S.C. § 42',
        url: 'https://www.novoco.com/resource-centers/affordable-residential-housing/lihtc-basics',
      },
    })
  }

  // ── Pathway 3: ED1 Streamlined (100% affordable) ──────────────────────────
  if (ed1_eligible) {
    // ED1 allows up to the TOC max or base zoning × 2, whichever is greater
    const ed1Units = Math.max(totalTocUnits, units_by_right * 2)
    citations.push(ED1_CITATION)

    pathways.push({
      id: 'ed1',
      name: 'ED1 Streamlined (100% Affordable)',
      description: `Executive Directive 1: ministerial (no hearing) approval for 100% affordable projects. Can achieve up to ${ed1Units} units. Fastest path to entitlement for affordable projects.`,
      category: 'ministerial',
      timeline_months: { min: 2, max: 6 },
      max_units: ed1Units,
      affordable_requirement_pct: 100,
      affordable_ami_limit: 80,
      parking_reduction: true,
      key_requirements: [
        '100% of units must be affordable (≤80% AMI)',
        'Minimum 5 units',
        'No discretionary hearing — LADBS ministerial review only',
        'Prevailing wage if using state/federal financing',
      ],
      risks: [
        '100% affordable = no market-rate revenue',
        'Requires tax credit or affordable financing stack to pencil',
        'Lower per-unit value — best for non-profit or mission-driven developers',
      ],
      citation: ED1_CITATION,
      speed_rank: 1,
      units_rank: 1,
      risk_rank: 1,
    })

    // ED1 + LIHTC 9% stacking
    stackedIncentives.push({
      program: 'HOME Investment Partnerships',
      type: 'Federal',
      description: 'HUD HOME funds for affordable rental housing — directly stackable with ED1 projects',
      estimated_subsidy_per_unit: 60_000,
      stacks_with: ['ED1', 'LIHTC', 'AHSC'],
      affordable_requirement: '100% affordable at ≤80% AMI',
      citation: {
        source: 'HUD',
        section: '42 U.S.C. § 12701 et seq.',
        url: 'https://www.hud.gov/program_offices/comm_planning/home',
      },
    })
    stackedIncentives.push({
      program: 'AHSC (Affordable Housing Sustainable Communities)',
      type: 'State',
      description: 'California cap-and-trade funds for affordable housing near transit — directly applicable to ED1 projects',
      estimated_subsidy_per_unit: 120_000,
      stacks_with: ['ED1', 'LIHTC', 'HOME'],
      affordable_requirement: '100% affordable, near transit',
      citation: {
        source: 'California HCD',
        section: 'Health & Safety Code § 50800 et seq.',
        url: 'https://www.hcd.ca.gov/grants-and-funding/grants-loans/ahsc',
      },
    })
  }

  // ── Pathway 4: SB 35 Streamlined ─────────────────────────────────────────
  // LA is behind 2015 RHNA targets — SB35 applies citywide for qualifying infill
  if (!in_hpoz && !highHazard && units_by_right >= 2) {
    const sb35Units = Math.max(totalTocUnits, units_by_right)
    citations.push(SB35_CITATION)

    pathways.push({
      id: 'sb35',
      name: 'SB 35 Streamlined Ministerial',
      description: `State law requires ministerial (no hearing) approval for qualifying multifamily infill in cities behind RHNA targets. LA qualifies. Mixed-income permitted. Up to ${sb35Units} units.`,
      category: 'streamlined',
      timeline_months: { min: 3, max: 9 },
      max_units: sb35Units,
      affordable_requirement_pct: 50,
      affordable_ami_limit: 80,
      parking_reduction: true,
      key_requirements: [
        '50% of units affordable (2/3 at ≤50% AMI, 1/3 at ≤80% AMI)',
        'Infill site (previously developed or urban land)',
        'Not in HPOZ, liquefaction zone, or high-hazard area',
        'Prevailing wage required for projects with ≥10 units',
        'No discretionary hearing — ministerial review only',
      ],
      risks: [
        '50% affordable requirement is significant',
        'Prevailing wage adds 15-25% to construction cost on larger projects',
        'City may challenge "infill" qualification',
      ],
      citation: SB35_CITATION,
      speed_rank: 2,
      units_rank: 2,
      risk_rank: 2,
    })
  }

  // ── Pathway 5: AB 2011 (Commercial → Residential) ─────────────────────────
  if (ab2011_eligible) {
    citations.push(AB2011_CITATION)
    const ab2011Units = Math.max(totalTocUnits, units_by_right)

    pathways.push({
      id: 'ab2011',
      name: 'AB 2011 Commercial Corridor Conversion',
      description: `Convert commercial zone (${z}) to residential under AB 2011. Mixed-income streamlined approval. No city discretionary hearing. Up to ${ab2011Units} units.`,
      category: 'streamlined',
      timeline_months: { min: 3, max: 8 },
      max_units: ab2011Units,
      affordable_requirement_pct: 15,
      affordable_ami_limit: 80,
      parking_reduction: true,
      key_requirements: [
        `${z} commercial zone qualifies under AB 2011`,
        '15% of units affordable (8% at ≤60% AMI + 7% at ≤80% AMI) for lower-income path',
        'OR 100% affordable path (ministerial, same as ED1)',
        'Prevailing wage for projects ≥16 units',
        'Must be on a "qualifying commercial corridor" (check LA planning)',
      ],
      risks: [
        'Prevailing wage increases cost for larger projects',
        'City still reviews for life-safety code compliance',
        'Commercial ground floor may be required in some community plans',
      ],
      citation: AB2011_CITATION,
      speed_rank: 2,
      units_rank: 2,
      risk_rank: 2,
    })
  }

  // ── Pathway 6: SB 9 (SFR lot split / duplex) ──────────────────────────────
  if (sb9_eligible) {
    citations.push(SB9_CITATION)

    pathways.push({
      id: 'sb9',
      name: 'SB 9 Lot Split / Urban Lot Split',
      description: 'State law allows splitting an SFR lot into 2 parcels, each with up to 2 units (4 units total on original lot). No affordable requirement. Ministerial approval.',
      category: 'ministerial',
      timeline_months: { min: 3, max: 8 },
      max_units: 4,
      affordable_requirement_pct: 0,
      affordable_ami_limit: 0,
      parking_reduction: true,
      key_requirements: [
        'R1/RS/RE zone (single-family residential)',
        'Not in HPOZ or historic district',
        'Not in high-hazard area (liquefaction, landslide)',
        'Owner-occupancy not required after 2025 (state law update)',
        'Ministerial — no public hearing',
      ],
      risks: [
        'Max 4 units total — limited upside on large lots',
        'SFR neighborhood context may limit rent achievable',
        'Lot dimensions may complicate split',
      ],
      citation: SB9_CITATION,
      speed_rank: 2,
      units_rank: 4,
      risk_rank: 1,
    })
  }

  // ── Pathway 7: ADU / JADU ─────────────────────────────────────────────────
  // Always available statewide as supplemental to any pathway
  citations.push(ADU_CITATION)
  pathways.push({
    id: 'adu',
    name: 'ADU / JADU (Supplemental)',
    description: 'Add 1 ADU (up to 1,200 sf) + 1 JADU (up to 500 sf, attached) to any property with an existing or proposed primary dwelling. No affordability requirement. Can stack on top of any other pathway.',
    category: 'ministerial',
    timeline_months: { min: 1, max: 4 },
    max_units: 2,  // supplemental only
    affordable_requirement_pct: 0,
    affordable_ami_limit: 0,
    parking_reduction: true,
    key_requirements: [
      '1 ADU (detached or attached) up to 1,200 sf',
      '1 JADU (attached) up to 500 sf',
      'No minimum lot size',
      'No owner-occupancy requirement (since 2023)',
      'Ministerial — typically 3-4 week turnaround',
    ],
    risks: [
      'Small scale — 2 units supplemental only',
      'Cannot exceed 1,200 sf for ADU',
    ],
    citation: ADU_CITATION,
    speed_rank: 1,
    units_rank: 5,
    risk_rank: 1,
  })

  // ── Pathway 8: Conditional Use (fallback / above-base density) ────────────
  citations.push(CUP_CITATION)
  pathways.push({
    id: 'cup',
    name: 'Conditional Use Permit (Discretionary)',
    description: 'Planning Commission hearing required. Allows density or uses above base zoning with conditions. Highest risk due to neighbor opposition and appeal exposure.',
    category: 'discretionary',
    timeline_months: { min: 18, max: 36 },
    max_units: Math.round(units_by_right * 1.5),  // rough estimate — project-specific
    affordable_requirement_pct: 15,
    affordable_ami_limit: 80,
    parking_reduction: false,
    key_requirements: [
      'Application to LA City Planning',
      'Environmental review (CEQA) — can add 12-24 months',
      'Public hearing before Planning Commission',
      'Subject to neighbor appeals',
    ],
    risks: [
      'CEQA challenge exposure',
      'Neighbor opposition can add years to timeline',
      'City may impose conditions that make project infeasible',
      'Not recommended when ministerial paths are available',
    ],
    citation: CUP_CITATION,
    speed_rank: 5,
    units_rank: 3,
    risk_rank: 5,
  })

  // ── Sort and select recommended paths ────────────────────────────────────
  // Filter out ADU (supplemental) and CUP (fallback) for primary path selection
  const primaryPaths = pathways.filter(p => p.id !== 'adu' && p.id !== 'cup')

  const fastestPath = primaryPaths.length > 0
    ? primaryPaths.reduce((a, b) => (a.timeline_months.min <= b.timeline_months.min ? a : b))
    : null

  const mostUnitsPath = primaryPaths.length > 0
    ? primaryPaths.reduce((a, b) => (a.max_units >= b.max_units ? a : b))
    : null

  const lowestRiskPath = primaryPaths.length > 0
    ? primaryPaths.reduce((a, b) => (a.risk_rank <= b.risk_rank ? a : b))
    : null

  // Recommended: favor ministerial + good unit count
  const ministerialPaths = primaryPaths.filter(p => p.category === 'ministerial' || p.category === 'by-right')
  const recommended = ministerialPaths.length > 0
    ? ministerialPaths.reduce((a, b) => (a.max_units >= b.max_units ? a : b))
    : (primaryPaths[0] ?? null)

  // ── Entitlement risk score (1-10) ─────────────────────────────────────────
  let riskScore = 2  // base: ministerial paths available
  if (!ed1_eligible && toc_tier === 0) riskScore += 2
  if (in_hpoz) riskScore += 2
  if (highHazard) riskScore += 2
  if (!ministerialPaths.length) riskScore += 3
  riskScore = Math.min(10, riskScore)

  // ── Timeline estimate ─────────────────────────────────────────────────────
  const bestTimeline = fastestPath?.timeline_months ?? { min: 12, max: 24 }

  // ── Permit fee estimate ───────────────────────────────────────────────────
  const targetUnits = recommended?.max_units ?? units_by_right
  const targetCategory = recommended?.category ?? 'by-right'
  const estimatedFees = estimatePermitFees(targetUnits, targetCategory)

  // ── Max units across all paths ────────────────────────────────────────────
  const unitsMaxAnyPath = pathways.reduce((max, p) => Math.max(max, p.max_units), 0)

  // ── Max stacked subsidy ───────────────────────────────────────────────────
  const maxSubsidy = stackedIncentives.reduce((sum, s) => sum + (s.estimated_subsidy_per_unit ?? 0), 0)

  return {
    pathways,
    fastest_path: fastestPath,
    most_units_path: mostUnitsPath,
    lowest_risk_path: lowestRiskPath,
    recommended_path: recommended,

    by_right_eligible: units_by_right > 0,
    streamlined_eligible: pathways.some(p => p.category === 'ministerial' || p.category === 'streamlined'),
    discretionary_required: !pathways.some(p => p.category !== 'discretionary'),
    estimated_timeline_months: bestTimeline,
    estimated_permit_fees: estimatedFees,
    entitlement_risk_score: riskScore,

    stacked_incentives: stackedIncentives,
    max_stacked_subsidy_per_unit: maxSubsidy,

    citations,

    zone: z,
    toc_tier,
    lot_size_sf,
    units_by_right,
    units_toc_bonus,
    units_max_any_path: unitsMaxAnyPath,
  }
}
