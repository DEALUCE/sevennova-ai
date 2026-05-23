import { SKILL_PROMPTS, NARRATIVE_PROMPT } from './skill-prompts'
import { analyzeEntitlement, type EntitlementAnalysis } from './entitlement'
import { runProfitModel, type ProfitModel } from './profit-model'
import { computeMassing, type MassingResult } from './massing'
import { fetchZoning, type ZimasResult } from './zimas'
import { sendEmail } from './agents/resend'
import { storeAuditRecord } from './audit'
import { fetchTOCTier } from './toc'
import { fetchSeismic } from './seismic'
import { collectSourceRegistry, type SourceResult } from './sources/adapter'
import { fetchRSO } from './rso'
import { fetchElevation } from './elevation'
import { fetchTransit } from './metro'
import { fetchAmenities } from './osm'
import { fetchEnviroScreen } from './enviroscreen'
import { fetchEPAEcho } from './epa'
import { fetchUnemployment } from './bls'
import { fetchBEA } from './bea'
import { fetchOverlays, computeEntitlementEligibility } from './overlays'
import { fetchHUDFMR } from './hud'
import { fetchCensusACS } from './census'

export interface Env {
  ANTHROPIC_API_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_BASIC: string
  STRIPE_PRICE_FULL: string
  STRIPE_PRICE_INSTITUTIONAL: string
  CORS_ORIGINS: string
  DEV_MODE?: string
  OLLAMA_URL?: string
  RESEND_API_KEY: string
  ADMIN_SECRET?: string
  GOOGLE_MAPS_API_KEY?: string
  HUD_API_KEY?: string           // Free key from huduser.gov — wrangler secret put HUD_API_KEY
  CENSUS_API_KEY?: string        // Free key from api.census.gov — wrangler secret put CENSUS_API_KEY
  SOCRATA_APP_TOKEN?: string     // data.lacity.org app token — wrangler secret put SOCRATA_APP_TOKEN
  BLS_API_KEY?: string           // Free key from bls.gov — wrangler secret put BLS_API_KEY
  BEA_API_KEY?: string           // Free key from apps.bea.gov — wrangler secret put BEA_API_KEY
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SEVENNOVA_KEYS: any
}

/**
 * PHASE 1 — Every DataPoint includes source provenance + verification status.
 * status: VERIFIED   = confirmed from a live public-record API
 *         INFERRED   = AI-interpreted from available data
 *         UNAVAILABLE = source query failed or returned no data
 *         NEEDS_HUMAN_REVIEW = data exists but requires expert validation
 */
export interface DataPoint {
  value: unknown
  confidence: number
  freshness: string
  source?: string
  source_url?: string
  retrieved_at?: string
  status?: 'VERIFIED' | 'INFERRED' | 'UNAVAILABLE' | 'NEEDS_HUMAN_REVIEW'
}

export interface SkillLog {
  skill_name: string
  activated: boolean
  confidence: number
  data_freshness: string
  error?: string
  duration_ms?: number
}

export interface PropertyReport {
  request_id: string
  address: Address
  tier: string
  generated_at: string
  generation_time_seconds: number
  deal_score: string
  deal_score_rationale: string
  overall_confidence: number
  data_freshness_summary: string
  zoning?: ZoningResult
  valuation?: ValuationResult
  distress?: DistressResult
  climate?: ClimateResult
  entitlement?: EntitlementResult
  entitlement_detailed?: EntitlementAnalysis
  profit_model_data?: ProfitModel
  massing_envelope?: MassingResult
  executive_summary: string
  investment_thesis: string
  risk_summary: string
  strategic_recommendations: string[]
  red_flags: string[]
  skills_activated: SkillLog[]
  assumptions: string[]
  unverified_items: string[]
  disclaimer: string
  cache_hit: boolean
  source_registry?: SourceResult[]
  manual_review_required?: boolean
  parcel_verified?: {
    elevation_ft: number | null
    transit_nearest_rail_mi: number | null
    transit_nearest_rail_name: string | null
    transit_score: number | null
    rso_in_area: boolean | null
    rso_label: string | null
    rso_status: string
    walkability_score: number | null
    walk_grocery_half_mi: number | null
    walk_restaurant_quarter_mi: number | null
    walk_park_quarter_mi: number | null
    walk_status: string
    enviro_ci_percentile: number | null
    enviro_pollution_percentile: number | null
    enviro_poverty_percentile: number | null
    enviro_diesel_percentile: number | null
    enviro_census_tract: string | null
    enviro_status: string
    epa_facilities_half_mi: number | null
    epa_rcra_hazwaste: number | null
    epa_significant_violators: number | null
    epa_current_violations: number | null
    epa_total_penalties_usd: number | null
    epa_status: string
    seismic_risk_label: string | null
    seismic_risk_score: number | null
    // LADBS rich permit data
    permits_5yr: number | null
    permit_types: string | null
    permit_total_valuation_usd: number | null
    permit_has_new_construction: boolean | null
    permit_has_demolition: boolean | null
    permit_most_recent_date: string | null
    permits_status: string
    bls_unemployment_rate: number | null
    bls_unemployment_month: string | null
    bls_cpi_value: number | null
    bls_cpi_month: string | null
    bls_cpi_change_1yr: number | null
    bls_nonfarm_employment_thousands: number | null
    bls_employment_month: string | null
    bls_api_tier: string | null
    bls_status: string
    bls_error: string | null
    // BEA — LA County GDP + personal income
    bea_personal_income_millions: number | null
    bea_personal_income_year: string | null
    bea_per_capita_income: number | null
    bea_per_capita_year: string | null
    bea_per_capita_change_1yr_pct: number | null
    bea_real_gdp_millions: number | null
    bea_gdp_year: string | null
    bea_gdp_change_1yr_pct: number | null
    bea_status: string
    bea_error: string | null
    community_plan_area: string | null
    council_district: number | null
    council_member: string | null
    overlays_status: string
    // Phase 3 — Seismic hazard overlays
    in_liquefaction_zone: boolean | null
    in_landslide_area: boolean | null
    geo_hazard_status: string
    // Phase 3 — Entitlement eligibility (zone-computed)
    ed1_eligible: boolean
    ed1_note: string
    sb9_eligible: boolean | null
    sb9_note: string
    ab2011_eligible: boolean | null
    ab2011_note: string
    hud_fmr_studio: number | null
    hud_fmr_1br: number | null
    hud_fmr_2br: number | null
    hud_fmr_3br: number | null
    hud_fmr_4br: number | null
    hud_fmr_year: string | null
    hud_fmr_status: string
    // Census ACS expanded
    census_tract: string | null
    census_median_income: number | null
    census_poverty_rate_pct: number | null
    census_total_housing_units: number | null
    census_owner_occupied_pct: number | null
    census_renter_occupied_pct: number | null
    census_median_gross_rent: number | null
    census_rent_burden_severe_pct: number | null
    census_total_population: number | null
    census_median_age: number | null
    census_college_degree_pct: number | null
    census_unemployment_rate_pct: number | null
    census_acs_year: string | null
    census_status: string
  }
}

export interface Address {
  street: string
  city: string
  state: string
  zip_code?: string
  apn?: string
  full_address: string
}

export interface ZoningResult {
  zoning_code: DataPoint
  permitted_uses: DataPoint
  max_far: DataPoint
  height_limit_ft: DataPoint
  toc_tier: DataPoint
  ed1_eligible: DataPoint
  ab2011_eligible: DataPoint
  rso_covered: DataPoint
  ladbs_violations: DataPoint
  buildable_sf: DataPoint
  max_units_by_right: DataPoint
  max_units_toc: DataPoint
  confidence_overall: number
}

export interface ValuationResult {
  legal_value: DataPoint
  climate_adjusted_value: DataPoint
  xgboost_estimate: DataPoint
  lightgbm_estimate: DataPoint
  catboost_estimate: DataPoint
  ensemble_estimate: DataPoint
  cap_rate: DataPoint
  price_per_unit: DataPoint
  diminution_estimate?: DataPoint
  confidence_overall: number
}

export interface DistressResult {
  distress_score: DataPoint
  dscr_estimate: DataPoint
  loan_maturity_risk: DataPoint
  ladbs_order_active: DataPoint
  entity_stress_signals: DataPoint
  event_window_months: DataPoint
  confidence_overall: number
}

export interface ClimateResult {
  flood_risk_score: DataPoint
  wildfire_risk_score: DataPoint
  heat_risk_score: DataPoint
  seismic_risk_score: DataPoint
  insurance_stress_score: DataPoint
  climate_haircut_pct: DataPoint
  confidence_overall: number
}

export interface EntitlementResult {
  best_pathway: DataPoint
  approval_probability: DataPoint
  timeline_months: DataPoint
  irr_impact_pct: DataPoint
  carry_cost_monthly: DataPoint
  jurisdiction_risk: DataPoint
  confidence_overall: number
}

// Skills activated per tier
const TIER_SKILLS: Record<string, string[]> = {
  basic: [
    'la-developer-intelligence',
    'ensemble-pricing-engine',
    'climate-adjusted-avm',
  ],
  full: [
    'la-developer-intelligence',
    'ensemble-pricing-engine',
    'climate-adjusted-avm',
    'distressed-debt-radar',
    'entitlement-velocity-engine',
    'geospatial-analysis',
    'pricing-oracle',
    'power-grid-intel',
  ],
  institutional: [
    'la-developer-intelligence',
    'ensemble-pricing-engine',
    'climate-adjusted-avm',
    'distressed-debt-radar',
    'entitlement-velocity-engine',
    'geospatial-analysis',
    'pricing-oracle',
    'power-grid-intel',
    'llc-veil-piercing',
    'institutional-capital-tracker',
    'satellite-change-detector',
  ],
}

// Maps skill name → which report field it populates
const SKILL_RESULT_MAP: Record<string, string> = {
  'la-developer-intelligence': 'zoning',
  'ensemble-pricing-engine': 'valuation',
  'climate-adjusted-avm': 'climate',
  'distressed-debt-radar': 'distress',
  'entitlement-velocity-engine': 'entitlement',
}

const DEV_MODEL = 'qwen2.5-coder:32b'

// Run tasks in batches of batchSize to avoid GPU memory overflow
async function batchedAll<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map(fn => fn())
    results.push(...await Promise.all(batch))
  }
  return results
}

async function callOllama(
  systemPrompt: string,
  userMessage: string,
  ollamaUrl: string,
): Promise<string> {
  const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: DEV_MODEL,
      // Force JSON output at inference level — overrides any markdown tendency
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content
}

async function callLLM(
  systemPrompt: string,
  userMessage: string,
  env: Env,
  _model = 'claude-haiku-4-5',
): Promise<string> {
  if (env.DEV_MODE === 'true' && env.OLLAMA_URL) {
    return callOllama(systemPrompt, userMessage, env.OLLAMA_URL)
  }
  return callAnthropic(systemPrompt, userMessage, env.ANTHROPIC_API_KEY, _model)
}

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model = 'claude-haiku-4-5',
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0].text
}

function parseJSON(raw: string, skillName = 'unknown'): Record<string, unknown> {
  // Strip markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/m, '').trim()

  // Attempt 1: direct parse
  try { return JSON.parse(cleaned) } catch { /* fall through */ }

  // Attempt 2: extract first {...} block (model may add prose before/after)
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch { /* fall through */ }
    // Attempt 3: truncated JSON — find last complete key-value by trimming trailing garbage
    try {
      const truncated = objMatch[0].replace(/,?\s*[^,}\]]*$/, '') + '}'
      return JSON.parse(truncated)
    } catch { /* fall through */ }
  }

  // Attempt 4: extract first [...] array wrapped as object
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return { items: JSON.parse(arrMatch[0]) } } catch { /* fall through */ }
  }

  throw new Error(`${skillName}: could not parse JSON from model output (${cleaned.slice(0, 120)}...)`)
}

async function runSkill(
  skillName: string,
  parcelData: Record<string, unknown>,
  env: Env,
): Promise<{ name: string; data: Record<string, unknown> | null; log: SkillLog }> {
  const start = Date.now()
  const prompt = SKILL_PROMPTS[skillName] ?? `
You are the ${skillName} skill for SevenNova.ai.
Analyze the property data and return a JSON object with your analysis.
Label uncertain data as UNVERIFIED. Include confidence scores (0-100). Never hallucinate — use null if unknown.
`
  try {
    const raw = await callLLM(
      prompt,
      `Analyze this property:\n${JSON.stringify(parcelData, null, 2)}`,
      env,
    )
    const data = parseJSON(raw, skillName)
    const duration_ms = Date.now() - start
    return {
      name: skillName,
      data,
      log: {
        skill_name: skillName,
        activated: true,
        confidence: Number(data.confidence_overall ?? 70),
        data_freshness: 'UNVERIFIED',
        duration_ms,
      },
    }
  } catch (e) {
    return {
      name: skillName,
      data: null,
      log: {
        skill_name: skillName,
        activated: false,
        confidence: 0,
        data_freshness: 'UNVERIFIED',
        error: String(e),
        duration_ms: Date.now() - start,
      },
    }
  }
}

// ── FREE DATA FETCHERS ────────────────────────────────────────────────────────

// ── LA COUNTY ASSESSOR ───────────────────────────────────────────────────────
// Primary: LA County GIS parcel ArcGIS layer (spatial query by lat/lon from ZIMAS)
// Fallback: address-based Socrata query on LA County Open Data
// The old undocumented assessor.lacounty.gov endpoint returned null for ~90% of addresses.

const ASSESSOR_ARCGIS = 'https://mapping.gis.lacounty.gov/arcgis/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query'
const ASSESSOR_SOCRATA = 'https://data.lacounty.gov/resource/9trm-uz8i.json'

async function fetchAssessorByCoords(lat: number, lon: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      distance: '75',
      units: 'esriSRUnit_Foot',
      outFields: 'AIN,SitusAddress,SitusCity,SitusZip,LotSqFt,LotAcres,UseType,UseCode,YearBuilt,EffectiveYear,SQFTmain,Units,Bedrooms,Bathrooms,RecordDate,SaleAmount',
      returnGeometry: 'false',
      f: 'json',
    })
    const res = await fetch(`${ASSESSOR_ARCGIS}?${params}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json() as { features?: Array<{ attributes: Record<string, unknown> }> }
    const p = data.features?.[0]?.attributes
    if (!p) return null
    const lotSf = p.LotSqFt ? Number(p.LotSqFt) : (p.LotAcres ? Math.round(Number(p.LotAcres) * 43560) : null)
    return {
      apn: String(p.AIN ?? ''),
      lot_size_sf: lotSf && lotSf > 0 ? lotSf : null,
      year_built: p.YearBuilt ? Number(p.YearBuilt) : null,
      units: p.Units ? Number(p.Units) : null,
      use_code: p.UseCode ?? null,
      use_type: p.UseType ?? null,
      sqft_main: p.SQFTmain ? Number(p.SQFTmain) : null,
      last_sale_price: p.SaleAmount ? Number(p.SaleAmount) : null,
      last_sale_date: p.RecordDate ? String(p.RecordDate) : null,
    }
  } catch { return null }
}

async function fetchAssessor(street: string, _city: string, zipCode?: string, lat?: number, lon?: number) {
  // Primary: spatial query if we have coordinates (more accurate)
  if (lat && lon) {
    const result = await fetchAssessorByCoords(lat, lon)
    if (result) return result
  }

  // Fallback: Socrata address-based query on LA County Open Data
  try {
    const q = encodeURIComponent(street.toUpperCase())
    const url = `${ASSESSOR_SOCRATA}?$where=upper(situs_address)%20like%20'${q}%25'${zipCode ? `%20AND%20situs_zip='${zipCode}'` : ''}&$limit=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json() as Array<Record<string, unknown>>
    const p = data?.[0]
    if (!p) return null
    const lotSf = p.lot_size_sqft ? Number(p.lot_size_sqft) : null
    return {
      apn: String(p.ain ?? p.apn ?? ''),
      lot_size_sf: lotSf && lotSf > 0 ? lotSf : null,
      year_built: p.year_built ? Number(p.year_built) : null,
      units: p.units ? Number(p.units) : null,
      use_code: p.use_code ?? null,
      use_type: p.use_type ?? null,
      sqft_main: p.sqft_main ? Number(p.sqft_main) : null,
      last_sale_price: p.sale_amount ? Number(p.sale_amount) : null,
      last_sale_date: p.record_date ? String(p.record_date) : null,
    }
  } catch { return null }
}

// Parse "3612 W Jefferson Blvd" → { houseNum: "3612", streetName: "JEFFERSON" }
function parseStreetParts(street: string): { houseNum: string; streetName: string } {
  const parts = street.trim().split(/\s+/)
  const houseNum = /^\d+/.test(parts[0]) ? parts[0] : ''
  // Remove house number + directional prefix (N/S/E/W) + suffix (AVE/BLVD/ST/etc)
  const directionals = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'])
  const suffixes = new Set(['AVE', 'BLVD', 'ST', 'DR', 'RD', 'LN', 'PL', 'CT', 'WAY', 'TER', 'CIR', 'HWY', 'FWY'])
  const tokens = parts.slice(houseNum ? 1 : 0)
    .map(t => t.toUpperCase())
    .filter(t => !directionals.has(t) && !suffixes.has(t))
  return { houseNum, streetName: tokens.join(' ') || (parts[1]?.toUpperCase() ?? '') }
}

async function fetchLADBS(street: string, _zipCode?: string, socrataToken?: string) {
  try {
    const { houseNum, streetName } = parseStreetParts(street)

    // Existing violations
    const violationUrl = `https://data.lacity.org/resource/u82d-eh7z.json?stname=${encodeURIComponent(streetName)}&$limit=50`

    // Rich permit data from hbkd-qubn (confirmed working, simple URL params)
    const fiveyrsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const richUrl = houseNum
      ? `https://data.lacity.org/resource/hbkd-qubn.json?street_name=${encodeURIComponent(streetName)}&address_start=${encodeURIComponent(houseNum)}&$limit=100&$order=issue_date DESC`
      : `https://data.lacity.org/resource/hbkd-qubn.json?street_name=${encodeURIComponent(streetName)}&$limit=100&$order=issue_date DESC`

    const socrataHeaders: Record<string, string> = { Accept: 'application/json' }
    if (socrataToken) socrataHeaders['X-App-Token'] = socrataToken

    const [richRes, violationsRes] = await Promise.all([
      fetch(richUrl, { headers: socrataHeaders }),
      fetch(violationUrl, { headers: socrataHeaders }),
    ])

    const richPermits = richRes.ok ? await richRes.json() as Array<Record<string, unknown>> : []
    const violations = violationsRes.ok ? await violationsRes.json() as Array<Record<string, unknown>> : []

    // Violations — stat='O' = open/active
    const active = violations.filter(r => String(r.stat ?? '').toUpperCase() === 'O')

    // Rich permit analysis
    const recent5yr = richPermits.filter(p => {
      const d = String(p.issue_date ?? '')
      return d >= fiveyrsAgo
    })

    // Permit types found (e.g. "Building, Plumbing, Electrical")
    const typeSet = new Set(richPermits.map(p => String(p.permit_type ?? '').trim()).filter(Boolean))
    const permitTypes = [...typeSet].join(', ') || null

    // Total valuation across all permits
    const totalValuation = richPermits.reduce((sum, p) => {
      const v = parseFloat(String(p.valuation ?? '0').replace(/[$,]/g, ''))
      return sum + (isFinite(v) ? v : 0)
    }, 0)

    // New construction / demolition flags — from permit_type + permit_sub_type
    const allTypes = richPermits.map(p =>
      `${String(p.permit_type ?? '')} ${String(p.permit_sub_type ?? '')}`.toUpperCase()
    )
    const hasNewConst = allTypes.some(t => t.includes('NEW') || t.includes('ADDITION'))
    const hasDemolition = allTypes.some(t => t.includes('DEMO'))

    // Most recent permit date
    const mostRecent = richPermits[0]?.issue_date ? String(richPermits[0].issue_date).slice(0, 10) : null

    return {
      active_violations: active.length,
      permit_count: richPermits.length,
      violation_count: violations.length,
      // Rich fields
      permits_5yr: recent5yr.length,
      permit_types: permitTypes,
      permit_total_valuation_usd: Math.round(totalValuation),
      permit_has_new_construction: hasNewConst,
      permit_has_demolition: hasDemolition,
      permit_most_recent_date: mostRecent,
      permits_status: richPermits.length > 0 ? 'VERIFIED' : 'UNAVAILABLE',
    }
  } catch { return null }
}

async function fetchFEMA(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE&f=json`,
    )
    if (!res.ok) return null
    const fData = await res.json() as { features?: Array<{ attributes?: { FLD_ZONE?: string } }> }
    const zone = fData.features?.[0]?.attributes?.FLD_ZONE ?? null
    return { flood_zone: zone }
  } catch { return null }
}

async function fetchCalFire(lat: number, lon: number) {
  try {
    // SRA (State Responsibility Area) FHSZ — urban areas return 0 features → NONE
    const res = await fetch(
      `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZSRA_23_3/FeatureServer/0/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FHSZ,FHSZ_Description&f=json`,
    )
    if (!res.ok) return null
    const cData = await res.json() as { features?: Array<{ attributes?: { FHSZ?: number; FHSZ_Description?: string } }> }
    const attrs = cData.features?.[0]?.attributes
    const zone = attrs?.FHSZ_Description ?? (attrs?.FHSZ != null ? String(attrs.FHSZ) : 'NONE')
    return { fire_hazard_zone: zone }
  } catch { return null }
}

async function geocodeToTract(lat: number, lon: number): Promise<{ state: string; county: string; tract: string; geoid: string } | null> {
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`,
    )
    if (!res.ok) return null
    const data = await res.json() as {
      result?: {
        geographies?: {
          'Census Tracts'?: Array<{ STATE: string; COUNTY: string; TRACT: string; GEOID: string }>
        }
      }
    }
    const tract = data.result?.geographies?.['Census Tracts']?.[0]
    if (!tract) return null
    return { state: tract.STATE, county: tract.COUNTY, tract: tract.TRACT, geoid: tract.GEOID }
  } catch { return null }
}

async function fetchCensus(lat: number, lon: number, apiKey?: string) {
  try {
    const tractInfo = await geocodeToTract(lat, lon)
    if (!tractInfo) return null
    return await fetchCensusACS(tractInfo.state, tractInfo.county, tractInfo.tract, tractInfo.geoid, apiKey)
  } catch { return null }
}

async function fetchHUD(lat: number, lon: number) {
  try {
    const tractInfo = await geocodeToTract(lat, lon)
    if (!tractInfo) return null
    const geoid10 = tractInfo.geoid
    // Layer 13 is the Opportunity Zones polygon layer
    const res = await fetch(
      `https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/13/query?where=GEOID10%3D'${geoid10}'&outFields=GEOID10%2CSTATE%2CCOUNTY%2CTRACT&f=json`,
    )
    if (!res.ok) return null
    const data = await res.json() as { features?: unknown[] }
    return { opportunity_zone: (data.features?.length ?? 0) > 0 }
  } catch { return null }
}

export async function generateReport(
  street: string,
  city: string,
  state: string,
  zipCode: string | undefined,
  apn: string | undefined,
  tier: string,
  requesterEmail: string | undefined,
  env: Env,
  userKey = 'anonymous',
): Promise<PropertyReport> {
  const start = Date.now()
  const requestId = crypto.randomUUID().replace(/-/g, '')
  const now = new Date().toISOString()

  const addressParts = [street, city, state]
  if (zipCode) addressParts[2] = `${state} ${zipCode}`
  const fullAddress = addressParts.join(', ')

  const address: Address = { street, city, state, zip_code: zipCode, apn, full_address: fullAddress }

  // Report-level cache — skips all API calls and skill calls on hit
  const normalizedTierEarly = ['basic', 'full', 'institutional'].includes(tier) ? tier : 'full'
  const reportCacheKey = 'report:' + fullAddress.toLowerCase().replace(/\s+/g, '_') + ':' + normalizedTierEarly
  const TTL_MS = 24 * 60 * 60 * 1000
  if (env.SEVENNOVA_KEYS) {
    const cachedReport = await env.SEVENNOVA_KEYS.get(reportCacheKey)
    if (cachedReport) {
      const parsed = JSON.parse(cachedReport) as { report: PropertyReport; cached_at: number }
      if (Date.now() - parsed.cached_at < TTL_MS) {
        return { ...parsed.report, cache_hit: true, generation_time_seconds: Math.round((Date.now() - start) / 100) / 10 }
      }
    }
  }

  // Geocode: detect commercial/DC zone signals
  const commercialKeywords = ['industrial', 'commercial']
  const isCommercial = commercialKeywords.some(kw => street.toLowerCase().includes(kw))
  const dcZips = new Set(['90245', '90017', '90028', '91731'])
  const isDCZone = zipCode ? dcZips.has(zipCode) : false

  const cacheKey = 'parcel:' + fullAddress.toLowerCase().replace(/\s+/g, '_')
  let cacheHit = false
  let parcelData: Record<string, unknown> = {}

  const cached = env.SEVENNOVA_KEYS ? await env.SEVENNOVA_KEYS.get(cacheKey) : null
  if (cached) {
    const parsed = JSON.parse(cached) as { parcelData: Record<string, unknown>; cached_at: number }
    if (Date.now() - parsed.cached_at < TTL_MS) {
      parcelData = parsed.parcelData
      cacheHit = true
    }
  }

  if (!cacheHit) {
    // Phase 1: ZIMAS first — provides lat/lon for geo-dependent fetchers
    const zimasResult = await Promise.allSettled([fetchZoning(street, city, state, zipCode)])
    const zimasPhase1: ZimasResult | null = zimasResult[0].status === 'fulfilled' ? zimasResult[0].value : null
    const lat = zimasPhase1?.lat ?? 34.0522
    const lon = zimasPhase1?.lon ?? -118.2437

    // Phase 2: All geo-dependent fetchers in parallel using resolved lat/lon
    // Assessor now uses lat/lon (spatial query) as primary, address as fallback
    const [
      assessorResult, ladbsResult, femaResult, calfireResult, censusResult,
      hudResult, tocResult, seismicResult,
      rsoResult, elevationResult, transitResult, amenitiesResult,
      enviroScreenResult, epaEchoResult,
      blsResult, overlaysResult, hudFmrResult, beaResult,
    ] =
      await Promise.allSettled([
        fetchAssessor(street, city, zipCode, lat, lon),
        fetchLADBS(street, zipCode, env.SOCRATA_APP_TOKEN),
        fetchFEMA(lat, lon),
        fetchCalFire(lat, lon),
        fetchCensus(lat, lon, env.CENSUS_API_KEY),
        fetchHUD(lat, lon),
        fetchTOCTier(lat, lon),
        fetchSeismic(lat, lon),
        fetchRSO(lat, lon),
        fetchElevation(lat, lon),
        fetchTransit(lat, lon),
        fetchAmenities(lat, lon),
        fetchEnviroScreen(lat, lon),
        fetchEPAEcho(lat, lon),
        fetchUnemployment(env.BLS_API_KEY),
        fetchOverlays(lat, lon),
        fetchHUDFMR(env.HUD_API_KEY),
        fetchBEA(env.BEA_API_KEY),
      ])

    const zimas: ZimasResult | null = zimasPhase1
    const assessor = assessorResult.status === 'fulfilled' ? assessorResult.value : null
    const ladbs = ladbsResult.status === 'fulfilled' ? ladbsResult.value : null
    // Wire APN from assessor into address if not provided by user
    if (assessor?.apn && !apn) apn = assessor.apn
    const fema = femaResult.status === 'fulfilled' ? femaResult.value : null
    const calfire = calfireResult.status === 'fulfilled' ? calfireResult.value : null
    const census = censusResult.status === 'fulfilled' ? censusResult.value : null
    const hud = hudResult.status === 'fulfilled' ? hudResult.value : null
    const toc = tocResult.status === 'fulfilled' ? tocResult.value : null
    const seismic = seismicResult.status === 'fulfilled' ? seismicResult.value : null
    const rso = rsoResult.status === 'fulfilled' ? rsoResult.value : null
    const elevation = elevationResult.status === 'fulfilled' ? elevationResult.value : null
    const transit = transitResult.status === 'fulfilled' ? transitResult.value : null
    const amenities = amenitiesResult.status === 'fulfilled' ? amenitiesResult.value : null
    const enviroScreen = enviroScreenResult.status === 'fulfilled' ? enviroScreenResult.value : null
    const epaEcho = epaEchoResult.status === 'fulfilled' ? epaEchoResult.value : null
    const bls = blsResult.status === 'fulfilled' ? blsResult.value : null
    const overlays = overlaysResult.status === 'fulfilled' ? overlaysResult.value : null
    const hudFmr = hudFmrResult.status === 'fulfilled' ? hudFmrResult.value : null
    const bea = beaResult.status === 'fulfilled' ? beaResult.value : null

    // Quick win 1 — Buildable SF + Max Units: pure math from ZIMAS FAR × Assessor lot size
    // Status VERIFIED only when both source values are confirmed live data
    const lotSizeSf = (assessor?.lot_size_sf as number | null) ?? null
    const zimasFar = zimas?.max_far ?? null
    const buildableSfCalc = (lotSizeSf && zimasFar) ? Math.round(lotSizeSf * zimasFar) : null

    const zoneClass = zimas?.zone_class ?? ''
    let maxUnitsByRightCalc: number | null = null
    if (lotSizeSf && zoneClass) {
      // LAMC Title 12 base density by zone class (simplified, by-right only, no ADU bonus)
      if (zoneClass.startsWith('R1'))      maxUnitsByRightCalc = 2          // house + 1 ADU by SB 9
      else if (zoneClass.startsWith('R1.5')) maxUnitsByRightCalc = Math.max(3, Math.floor(lotSizeSf / 1200))
      else if (zoneClass === 'RD1.5')      maxUnitsByRightCalc = Math.floor(lotSizeSf / 1200)
      else if (zoneClass === 'RD2')        maxUnitsByRightCalc = Math.floor(lotSizeSf / 1200)
      else if (zoneClass === 'RD3')        maxUnitsByRightCalc = Math.floor(lotSizeSf / 1200)
      else if (zoneClass === 'RD4')        maxUnitsByRightCalc = Math.floor(lotSizeSf / 1600)
      else if (zoneClass === 'RD5')        maxUnitsByRightCalc = Math.floor(lotSizeSf / 2000)
      else if (zoneClass === 'RD6')        maxUnitsByRightCalc = Math.floor(lotSizeSf / 2400)
      else if (zoneClass.startsWith('R2')) maxUnitsByRightCalc = Math.floor(lotSizeSf / 1500)
      else if (zoneClass.startsWith('R3')) maxUnitsByRightCalc = Math.floor(lotSizeSf / 800)
      else if (zoneClass.startsWith('R4')) maxUnitsByRightCalc = Math.floor(lotSizeSf / 400)
      else if (zoneClass.startsWith('R5')) maxUnitsByRightCalc = Math.floor(lotSizeSf / 200)
      // C/M zones: residential density not applicable by-right (commercial use)
    }

    // TOC bonus units (if in TOC area and residential zone)
    const TOC_BONUS: Record<number, number> = { 1: 0.225, 2: 0.325, 3: 0.50, 4: 0.80 }
    let maxUnitsTOCCalc: number | null = null
    if (maxUnitsByRightCalc !== null && toc?.tier) {
      const bonus = TOC_BONUS[toc.tier] ?? 0
      maxUnitsTOCCalc = Math.floor(maxUnitsByRightCalc * (1 + bonus))
    }

    const zimasZoneClass = zimas?.zone_class ?? ''
    const isCommercialFromZimas = /^(C|M|CM|CR)/.test(zimasZoneClass)

    parcelData = {
      full_address: fullAddress,
      street, city, state,
      zip_code: zipCode ?? null,
      apn: apn ?? null,
      is_commercial: isCommercial || isCommercialFromZimas,
      is_data_center_zone: isDCZone,
      zimas_zone_code: zimas?.zone_code ?? null,
      zimas_zone_class: zimas?.zone_class ?? null,
      zimas_zone_description: zimas?.zone_description ?? null,
      zimas_max_far: zimas?.max_far ?? null,
      zimas_height_limit_ft: zimas?.height_limit_ft ?? null,
      zimas_height_limit_stories: zimas?.height_limit_stories ?? null,
      zimas_hpoz_name: zimas?.hpoz_name ?? null,
      zimas_lat: zimas?.lat ?? null,
      zimas_lon: zimas?.lon ?? null,
      zimas_source: zimas?.error ? `ZIMAS_ERROR: ${zimas.error}` : (zimas ? 'LA_CITY_ZIMAS_LIVE' : 'UNAVAILABLE'),
      freshness: zimas && !zimas.error ? 'LA_CITY_LIVE' : 'UNVERIFIED',
      confidence: zimas && !zimas.error ? 90 : 0,
      // Assessor — now from LA County GIS ArcGIS spatial query (primary) or Socrata (fallback)
      // apn already set above (line 663) — assessor may have enriched it via the APN reassignment above
      lot_size_sf: assessor?.lot_size_sf ?? null,
      units: assessor?.units ?? null,
      use_code: assessor?.use_code ?? null,
      use_type: assessor?.use_type ?? null,
      sqft_main: assessor?.sqft_main ?? null,
      year_built: assessor?.year_built ?? null,
      last_sale_price: assessor?.last_sale_price ?? null,
      last_sale_date: assessor?.last_sale_date ?? null,
      assessor_source: assessor ? 'LA_COUNTY_ASSESSOR_LIVE' : 'UNAVAILABLE',
      ladbs_active_violations: ladbs?.active_violations ?? null,
      ladbs_permit_count: ladbs?.permit_count ?? null,
      ladbs_source: ladbs ? 'LADBS_LIVE' : 'UNAVAILABLE',
      // Rich permit fields
      ladbs_permits_5yr: ladbs?.permits_5yr ?? null,
      ladbs_permit_types: ladbs?.permit_types ?? null,
      ladbs_permit_total_valuation_usd: ladbs?.permit_total_valuation_usd ?? null,
      ladbs_permit_has_new_construction: ladbs?.permit_has_new_construction ?? null,
      ladbs_permit_has_demolition: ladbs?.permit_has_demolition ?? null,
      ladbs_permit_most_recent_date: ladbs?.permit_most_recent_date ?? null,
      ladbs_permits_status: ladbs?.permits_status ?? 'UNAVAILABLE',
      fema_flood_zone: fema?.flood_zone ?? null,
      fema_source: fema ? 'FEMA_LIVE' : 'UNAVAILABLE',
      fire_hazard_zone: calfire?.fire_hazard_zone ?? null,
      calfire_source: calfire ? 'CALFIRE_LIVE' : 'UNAVAILABLE',
      census_median_income: census?.median_household_income ?? (census as { median_income?: number | null } | null)?.median_income ?? null,
      census_rent_burden: census?.rent_burden_severe_pct ?? null,
      census_tract: census?.census_tract ?? null,
      census_source: census?.status === 'VERIFIED' ? 'CENSUS_ACS_LIVE' : (census?.status === 'PARTIAL' ? 'CENSUS_ACS_PARTIAL' : 'UNAVAILABLE'),
      // Census ACS expanded fields
      census_poverty_rate_pct: census?.poverty_rate_pct ?? null,
      census_total_housing_units: census?.total_housing_units ?? null,
      census_owner_occupied_pct: census?.owner_occupied_pct ?? null,
      census_renter_occupied_pct: census?.renter_occupied_pct ?? null,
      census_median_gross_rent: census?.median_gross_rent ?? null,
      census_total_population: census?.total_population ?? null,
      census_median_age: census?.median_age ?? null,
      census_college_degree_pct: census?.college_degree_pct ?? null,
      census_unemployment_rate_pct: census?.unemployment_rate_pct ?? null,
      census_acs_year: census?.acs_year ?? null,
      census_status: census?.status ?? 'UNAVAILABLE',
      opportunity_zone: hud?.opportunity_zone ?? null,
      hud_source: hud ? 'HUD_LIVE' : 'UNAVAILABLE',
      // Quick win 2 — TOC Tier (LA City GIS)
      toc_tier: toc?.tier ?? null,
      toc_tier_label: toc?.tier_label ?? null,
      toc_in_area: toc?.in_toc_area ?? false,
      toc_source: toc && !toc.error ? 'LA_CITY_TOC_LIVE' : 'UNAVAILABLE',
      toc_source_url: toc?.source_url ?? null,
      toc_retrieved_at: toc?.retrieved_at ?? null,
      toc_error: toc?.error ?? null,
      // Quick win 4 — Seismic (USGS)
      seismic_ss: seismic?.ss ?? null,
      seismic_s1: seismic?.s1 ?? null,
      seismic_pga: seismic?.pga ?? null,
      seismic_risk_score: seismic?.risk_score ?? null,
      seismic_risk_label: seismic?.risk_label ?? null,
      seismic_source: seismic && !seismic.error ? 'USGS_SEISMIC_LIVE' : 'UNAVAILABLE',
      seismic_source_url: seismic?.source_url ?? null,
      seismic_retrieved_at: seismic?.retrieved_at ?? null,
      // Quick win 1 — Buildable SF + Max Units (calculated from ZIMAS + Assessor)
      buildable_sf_calc: buildableSfCalc,
      max_units_by_right_calc: maxUnitsByRightCalc,
      max_units_toc_calc: maxUnitsTOCCalc,
      derived_fields_status: (zimasFar !== null && lotSizeSf !== null) ? 'VERIFIED_CALCULATED' : 'UNAVAILABLE',
      // Phase 1 new connectors
      rso_in_area: rso?.in_rso_area ?? null,
      rso_label: rso?.rso_label ?? null,
      rso_status: rso?.status ?? 'UNAVAILABLE',
      rso_source: rso?.status === 'VERIFIED' ? 'LA_CITY_RSO_LIVE' : 'UNAVAILABLE',
      elevation_ft: elevation?.elevation_ft ?? null,
      elevation_status: elevation?.status ?? 'UNAVAILABLE',
      elevation_source: elevation?.status === 'VERIFIED' ? 'USGS_EPQS_LIVE' : 'UNAVAILABLE',
      transit_nearest_rail_mi: transit?.nearest_rail_mi ?? null,
      transit_nearest_rail_name: transit?.nearest_rail_name ?? null,
      transit_nearest_bus_mi: transit?.nearest_bus_mi ?? null,
      transit_bus_stops_quarter_mi: transit?.bus_stops_within_quarter_mi ?? null,
      transit_score: transit?.transit_score ?? null,
      transit_status: transit?.status ?? 'UNAVAILABLE',
      transit_source: transit?.status === 'VERIFIED' ? (transit.source === 'LA_METRO_STATIC' ? 'LA_METRO_STATIC_LIVE' : 'OSM_OVERPASS_LIVE') : 'UNAVAILABLE',
      walk_grocery_half_mi: amenities?.grocery_within_half_mi ?? null,
      walk_pharmacy_quarter_mi: amenities?.pharmacy_within_quarter_mi ?? null,
      walk_school_half_mi: amenities?.school_within_half_mi ?? null,
      walk_park_quarter_mi: amenities?.park_within_quarter_mi ?? null,
      walk_restaurant_quarter_mi: amenities?.restaurant_within_quarter_mi ?? null,
      walkability_score: amenities?.walkability_score ?? null,
      walk_status: amenities?.status ?? 'UNAVAILABLE',
      walk_source: amenities?.status === 'VERIFIED' ? 'OSM_OVERPASS_LIVE' : 'UNAVAILABLE',
      enviro_census_tract: enviroScreen?.census_tract ?? null,
      enviro_ci_percentile: enviroScreen?.ci_score_percentile ?? null,
      enviro_pollution_percentile: enviroScreen?.pollution_percentile ?? null,
      enviro_pop_char_percentile: enviroScreen?.pop_char_percentile ?? null,
      enviro_diesel_percentile: enviroScreen?.diesel_percentile ?? null,
      enviro_traffic_percentile: enviroScreen?.traffic_percentile ?? null,
      enviro_poverty_percentile: enviroScreen?.poverty_percentile ?? null,
      enviro_status: enviroScreen?.status ?? 'UNAVAILABLE',
      enviro_source: enviroScreen?.status === 'VERIFIED' ? 'CALENVIROSCREEN_4_LIVE' : 'UNAVAILABLE',
      epa_facilities_half_mi: epaEcho?.total_facilities ?? null,
      epa_rcra_hazwaste: epaEcho?.rcra_hazardous_waste ?? null,
      epa_significant_violators: epaEcho?.significant_violators ?? null,
      epa_current_violations: epaEcho?.current_violations ?? null,
      epa_total_penalties_usd: epaEcho?.total_penalties_usd ?? null,
      epa_status: epaEcho?.status ?? 'UNAVAILABLE',
      epa_source: epaEcho?.status === 'VERIFIED' ? 'EPA_ECHO_LIVE' : 'UNAVAILABLE',
      // BLS — unemployment + CPI + employment (v2 with key, v1 without)
      bls_unemployment_rate: bls?.unemployment_rate_pct ?? null,
      bls_unemployment_month: bls?.unemployment_month ?? null,
      bls_cpi_value: bls?.cpi_value ?? null,
      bls_cpi_month: bls?.cpi_month ?? null,
      bls_cpi_change_1yr: bls?.cpi_change_1yr ?? null,
      bls_nonfarm_employment_thousands: bls?.nonfarm_employment_thousands ?? null,
      bls_employment_month: bls?.employment_month ?? null,
      bls_api_tier: bls?.api_tier ?? null,
      bls_status: bls?.status ?? 'UNAVAILABLE',
      bls_error: bls?.error ?? null,
      bls_source: bls?.status === 'VERIFIED' ? 'BLS_LAUS_LIVE' : 'UNAVAILABLE',
      // BEA — per capita income + GDP (LA County)
      bea_personal_income_millions: bea?.personal_income_millions ?? null,
      bea_personal_income_year: bea?.personal_income_year ?? null,
      bea_per_capita_income: bea?.per_capita_income ?? null,
      bea_per_capita_year: bea?.per_capita_year ?? null,
      bea_per_capita_change_1yr_pct: bea?.per_capita_change_1yr_pct ?? null,
      bea_real_gdp_millions: bea?.real_gdp_millions ?? null,
      bea_gdp_year: bea?.gdp_year ?? null,
      bea_gdp_change_1yr_pct: bea?.gdp_change_1yr_pct ?? null,
      bea_status: bea?.status ?? 'UNAVAILABLE',
      bea_error: bea?.error ?? null,
      bea_source: bea?.status === 'VERIFIED' ? 'BEA_REGIONAL_LIVE' : 'UNAVAILABLE',
      // Phase 2 — Community Plan + Council District
      community_plan_area: overlays?.community_plan_area ?? null,
      community_plan_num: overlays?.community_plan_num ?? null,
      council_district: overlays?.council_district ?? null,
      council_member: overlays?.council_member ?? null,
      council_district_label: overlays?.council_district_label ?? null,
      overlays_status: overlays?.status ?? 'UNAVAILABLE',
      overlays_source: overlays?.status === 'VERIFIED' ? 'LA_CITY_OVERLAYS_LIVE' : 'UNAVAILABLE',
      // Phase 3 — seismic hazard
      in_liquefaction_zone: overlays?.in_liquefaction_zone ?? null,
      in_landslide_area: overlays?.in_landslide_area ?? null,
      geo_hazard_status: overlays?.geo_hazard_status ?? 'UNAVAILABLE',
      // Phase 3 — entitlement eligibility (zone-computed)
      ...(() => {
        const ent = computeEntitlementEligibility(
          zimas?.zone_class ?? null,
          zimas?.hpoz_name ?? null,
          overlays?.in_liquefaction_zone ?? null,
          overlays?.in_landslide_area ?? null,
        )
        return {
          ed1_eligible: ent.ed1_eligible,
          ed1_note: ent.ed1_note,
          sb9_eligible: ent.sb9_eligible,
          sb9_note: ent.sb9_note,
          ab2011_eligible: ent.ab2011_eligible,
          ab2011_note: ent.ab2011_note,
        }
      })(),
      // Phase 2 — HUD FMR
      hud_fmr_studio: hudFmr?.fmr_studio ?? null,
      hud_fmr_1br: hudFmr?.fmr_1br ?? null,
      hud_fmr_2br: hudFmr?.fmr_2br ?? null,
      hud_fmr_3br: hudFmr?.fmr_3br ?? null,
      hud_fmr_4br: hudFmr?.fmr_4br ?? null,
      hud_fmr_year: hudFmr?.fiscal_year ?? null,
      hud_fmr_status: hudFmr?.status ?? 'UNAVAILABLE',
      hud_fmr_source: hudFmr?.status === 'VERIFIED' ? 'HUD_FMR_LIVE' : (hudFmr ? 'HUD_FMR_STATIC' : 'UNAVAILABLE'),
    }

    if (env.SEVENNOVA_KEYS) {
      await env.SEVENNOVA_KEYS.put(cacheKey, JSON.stringify({ parcelData, cached_at: Date.now() }))
    }
  }

  // Build source registry from prefetched parcel data — no extra API calls
  const registryParams = {
    address: fullAddress,
    street, city, state,
    zip_code: zipCode,
    lat: (parcelData.zimas_lat as number | null) ?? undefined,
    lon: (parcelData.zimas_lon as number | null) ?? undefined,
    apn: apn ?? undefined,
    prefetched: {
      zimas: parcelData.zimas_source === 'LA_CITY_ZIMAS_LIVE' ? {
        source: 'zimas' as const,
        lat: parcelData.zimas_lat as number,
        lon: parcelData.zimas_lon as number,
        zone_code: String(parcelData.zimas_zone_code ?? ''),
        zone_class: String(parcelData.zimas_zone_class ?? ''),
        height_district: '1',
        zone_description: String(parcelData.zimas_zone_description ?? ''),
        max_far: parcelData.zimas_max_far as number | null,
        height_limit_ft: parcelData.zimas_height_limit_ft as number | null,
        height_limit_stories: parcelData.zimas_height_limit_stories as number | null,
        hpoz_name: parcelData.zimas_hpoz_name as string | null,
        raw: {},
      } : null,
      ladbs: parcelData.ladbs_source === 'LADBS_LIVE' ? {
        active_violations: parcelData.ladbs_active_violations as number,
        permit_count: parcelData.ladbs_permit_count as number,
        violation_count: parcelData.ladbs_active_violations as number,
      } : null,
      fema: parcelData.fema_source === 'FEMA_LIVE' ? { flood_zone: parcelData.fema_flood_zone as string | null } : null,
      calfire: parcelData.calfire_source === 'CALFIRE_LIVE' ? { fire_hazard_zone: String(parcelData.fire_hazard_zone ?? 'NONE') } : null,
      census: parcelData.census_source === 'CENSUS_ACS_LIVE' ? {
        median_income: parcelData.census_median_income as number | null,
        rent_burden_severe_pct: parcelData.census_rent_burden as number | null,
        census_tract: parcelData.census_tract as string | null,
      } : null,
      hud: parcelData.hud_source === 'HUD_LIVE' ? { opportunity_zone: Boolean(parcelData.opportunity_zone) } : null,
    },
  }
  const sourceRegistry = collectSourceRegistry(registryParams)
  const anyManualReview = sourceRegistry.some(r => r.manual_review_required && r.status === 'NEEDS_HUMAN_REVIEW')

  // Skill routing
  const normalizedTier = ['basic', 'full', 'institutional'].includes(tier) ? tier : 'full'
  let skills = [...(TIER_SKILLS[normalizedTier] ?? TIER_SKILLS.full)]
  if (isCommercial && normalizedTier !== 'basic') {
    skills.push('tenant-credit-collapse', 'tenant-demand-signal')
  }
  if (isDCZone && normalizedTier !== 'basic') {
    skills.push('data-center-intelligence')
  }

  const skillResults = await Promise.all(skills.map(name => runSkill(name, parcelData, env)))

  const skillResultMap: Record<string, Record<string, unknown>> = {}
  const skillLogs: SkillLog[] = []
  const assumptions: string[] = []
  const unverified: string[] = []

  for (const result of skillResults) {
    skillLogs.push(result.log)
    if (result.data) {
      skillResultMap[result.name] = result.data
      if (Array.isArray(result.data.assumptions)) {
        assumptions.push(...(result.data.assumptions as string[]))
      }
      if (Array.isArray(result.data.unverified_items)) {
        unverified.push(...(result.data.unverified_items as string[]))
      }
    }
  }

  // Generate narrative using opus
  let narrative: Record<string, unknown> = {
    executive_summary: 'Analysis complete. See skill outputs for details.',
    investment_thesis: '[UNVERIFIED] Insufficient data for full thesis.',
    risk_summary: 'Multiple unverified data points — verify before decision.',
    strategic_recommendations: [
      'Verify all UNVERIFIED data points',
      'Consult licensed appraiser',
      'Review LADBS records directly',
    ],
    red_flags: [],
    deal_score: 'C',
    deal_score_rationale: 'Incomplete analysis due to data gaps.',
    overall_confidence: 60,
  }

  // Condense skill results for narrative — extract only leaf values (no nested DataPoint wrappers)
  // Keeps narrative input under ~3k tokens so smaller local models stay on-task
  const condensed: Record<string, Record<string, unknown>> = {}
  for (const [skill, data] of Object.entries(skillResultMap)) {
    const flat: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && typeof v === 'object' && 'value' in (v as object)) {
        flat[k] = (v as Record<string, unknown>).value
      } else if (!Array.isArray(v)) {
        flat[k] = v
      }
    }
    condensed[skill] = flat
  }

  try {
    const narrativeModel = normalizedTier === 'institutional' ? 'claude-opus-4-5' : 'claude-haiku-4-5'
    const raw = await callLLM(
      NARRATIVE_PROMPT,
      `Property: ${fullAddress}\nTier: ${normalizedTier}\nSkill Results:\n${JSON.stringify(condensed, null, 2)}\nAssumptions: ${[...new Set(assumptions)].join('; ')}\nUnverified: ${[...new Set(unverified)].join('; ')}`,
      env,
      narrativeModel,
    )
    const parsed = parseJSON(raw, 'narrative')
    // Only accept if key fields are non-empty strings
    if (parsed.executive_summary && String(parsed.executive_summary).length > 20) {
      narrative = parsed
    } else {
      narrative.red_flags = ['Narrative returned empty fields — skill data used directly']
    }
  } catch (e) {
    narrative.red_flags = [`Narrative generation failed: ${String(e)}`]
  }

  // Extract typed skill results
  const zoningRaw = skillResultMap['la-developer-intelligence']
  const valuationRaw = skillResultMap['ensemble-pricing-engine']
  const distressRaw = skillResultMap['distressed-debt-radar']
  const climateRaw = skillResultMap['climate-adjusted-avm']
  const entitlementRaw = skillResultMap['entitlement-velocity-engine']

  const retrievedAt = now

  const dp = (val: unknown, conf = 70, status: DataPoint['status'] = 'INFERRED', source?: string): DataPoint => ({
    value: val ?? null,
    confidence: conf,
    freshness: status === 'VERIFIED' ? 'LA_CITY_LIVE' : 'UNVERIFIED',
    status,
    source,
    retrieved_at: retrievedAt,
  })

  const extractDP = (obj: Record<string, unknown> | undefined, key: string): DataPoint => {
    if (!obj) return dp(null, 0, 'UNAVAILABLE')
    const raw = obj[key] as Record<string, unknown> | undefined
    if (!raw) return dp(null, 0, 'UNAVAILABLE')
    return {
      value: raw.value ?? null,
      confidence: Number(raw.confidence ?? 70),
      freshness: String(raw.freshness ?? 'UNVERIFIED'),
      status: (raw.status as DataPoint['status']) ?? 'INFERRED',
      source: raw.source as string | undefined,
      source_url: raw.source_url as string | undefined,
      retrieved_at: raw.retrieved_at as string | undefined ?? retrievedAt,
    }
  }

  // Phase 1: ZIMAS-sourced fields get VERIFIED status; AI-inferred fields get INFERRED
  const zimasLive = parcelData.zimas_source === 'LA_CITY_ZIMAS_LIVE'
  const ladbsLive = parcelData.ladbs_source === 'LADBS_LIVE'
  const zimasSourceUrl = 'https://maps.lacity.org/lahub/rest/services/City_Planning_Department/MapServer/8'
  const ladbsSourceUrl = 'https://data.lacity.org/resource/u82d-eh7z.json'

  const verifiedDP = (val: unknown, conf: number, source: string, url: string): DataPoint => ({
    value: val ?? null,
    confidence: val != null ? conf : 0,
    freshness: val != null ? 'LA_CITY_LIVE' : 'UNVERIFIED',
    status: val != null ? 'VERIFIED' : 'UNAVAILABLE',
    source,
    source_url: url,
    retrieved_at: retrievedAt,
  })

  const zoning: ZoningResult | undefined = zoningRaw ? {
    // Fields sourced directly from ZIMAS → VERIFIED
    zoning_code: zimasLive
      ? verifiedDP(parcelData.zimas_zone_code, 99, 'LA City ZIMAS', zimasSourceUrl)
      : extractDP(zoningRaw, 'zoning_code'),
    max_far: zimasLive
      ? verifiedDP(parcelData.zimas_max_far, 99, 'LA City ZIMAS / LAMC Table 12.21-A-10', zimasSourceUrl)
      : extractDP(zoningRaw, 'max_far'),
    height_limit_ft: zimasLive
      ? verifiedDP(parcelData.zimas_height_limit_ft, 99, 'LA City ZIMAS / LAMC 12.21.1', zimasSourceUrl)
      : extractDP(zoningRaw, 'height_limit_ft'),
    // LADBS violations → VERIFIED if live
    ladbs_violations: ladbsLive
      ? verifiedDP(parcelData.ladbs_active_violations, 95, 'LADBS Open Violations', ladbsSourceUrl)
      : extractDP(zoningRaw, 'ladbs_violations'),
    // AI-inferred fields — entitlement overlays require LAMC + DCP analysis
    permitted_uses: extractDP(zoningRaw, 'permitted_uses'),
    // Quick win 2 — TOC tier from LA City GIS (VERIFIED when available)
    toc_tier: parcelData.toc_source === 'LA_CITY_TOC_LIVE'
      ? verifiedDP(parcelData.toc_in_area ? `Tier ${parcelData.toc_tier} — ${parcelData.toc_tier_label}` : 'Not in TOC area', 99, 'LA City Planning GeoHub — TOC Eligible Areas', String(parcelData.toc_source_url ?? ''))
      : dp(null, 0, 'UNAVAILABLE'),
    ed1_eligible: extractDP(zoningRaw, 'ed1_eligible'),
    ab2011_eligible: extractDP(zoningRaw, 'ab2011_eligible'),
    rso_covered: extractDP(zoningRaw, 'rso_covered'),
    // Quick win 1 — use calculated values when available; fall back to AI skill
    buildable_sf: parcelData.buildable_sf_calc != null
      ? verifiedDP(parcelData.buildable_sf_calc, 95, 'Calculated: ZIMAS FAR × LA County Assessor lot size', 'https://assessor.lacounty.gov')
      : dp(null, 0, 'UNAVAILABLE'),
    max_units_by_right: parcelData.max_units_by_right_calc != null
      ? verifiedDP(parcelData.max_units_by_right_calc, 90, 'Calculated: LAMC Title 12 base density × lot size (architectural analysis required for final count)', 'https://library.municode.com/ca/los_angeles/codes/municipal_code')
      : dp(null, 0, 'UNAVAILABLE'),
    max_units_toc: parcelData.max_units_toc_calc != null
      ? verifiedDP(parcelData.max_units_toc_calc, 88, 'Calculated: by-right units × TOC bonus (LA City Planning GeoHub)', 'https://planning.lacity.gov/plans-policies/initiatives-policies/toc')
      : dp(null, 0, 'UNAVAILABLE'),
    confidence_overall: zimasLive ? Math.max(Number(zoningRaw.confidence_overall ?? 70), 85) : Number(zoningRaw.confidence_overall ?? 70),
  } : undefined

  const valuation: ValuationResult | undefined = valuationRaw ? {
    legal_value: extractDP(valuationRaw, 'legal_value'),
    climate_adjusted_value: extractDP(valuationRaw, 'climate_adjusted_value'),
    xgboost_estimate: extractDP(valuationRaw, 'xgboost_estimate'),
    lightgbm_estimate: extractDP(valuationRaw, 'lightgbm_estimate'),
    catboost_estimate: extractDP(valuationRaw, 'catboost_estimate'),
    ensemble_estimate: extractDP(valuationRaw, 'ensemble_estimate'),
    cap_rate: extractDP(valuationRaw, 'cap_rate'),
    price_per_unit: extractDP(valuationRaw, 'price_per_unit'),
    diminution_estimate: valuationRaw.diminution_estimate ? extractDP(valuationRaw, 'diminution_estimate') : undefined,
    confidence_overall: Number(valuationRaw.confidence_overall ?? 70),
  } : undefined

  const distress: DistressResult | undefined = distressRaw ? {
    distress_score: extractDP(distressRaw, 'distress_score'),
    dscr_estimate: extractDP(distressRaw, 'dscr_estimate'),
    loan_maturity_risk: extractDP(distressRaw, 'loan_maturity_risk'),
    ladbs_order_active: extractDP(distressRaw, 'ladbs_order_active'),
    entity_stress_signals: extractDP(distressRaw, 'entity_stress_signals'),
    event_window_months: extractDP(distressRaw, 'event_window_months'),
    confidence_overall: Number(distressRaw.confidence_overall ?? 70),
  } : undefined

  const climate: ClimateResult | undefined = climateRaw ? {
    flood_risk_score: extractDP(climateRaw, 'flood_risk_score'),
    wildfire_risk_score: extractDP(climateRaw, 'wildfire_risk_score'),
    heat_risk_score: extractDP(climateRaw, 'heat_risk_score'),
    // Quick win 4 — seismic from USGS (VERIFIED when available)
    seismic_risk_score: parcelData.seismic_source === 'USGS_SEISMIC_LIVE' && parcelData.seismic_risk_score != null
      ? verifiedDP(
          `${parcelData.seismic_risk_label} (Ss=${parcelData.seismic_ss}g${parcelData.seismic_pga != null ? ', PGA=' + parcelData.seismic_pga + 'g' : ''})`,
          99,
          'USGS Earthquake Hazards Program — ASCE 7-22 Design Maps',
          String(parcelData.seismic_source_url ?? ''),
        )
      : dp(null, 0, 'UNAVAILABLE'),
    insurance_stress_score: extractDP(climateRaw, 'insurance_stress_score'),
    climate_haircut_pct: extractDP(climateRaw, 'climate_haircut_pct'),
    confidence_overall: Number(climateRaw.confidence_overall ?? 70),
  } : undefined

  const entitlement: EntitlementResult | undefined = entitlementRaw ? {
    best_pathway: extractDP(entitlementRaw, 'best_pathway'),
    approval_probability: extractDP(entitlementRaw, 'approval_probability'),
    timeline_months: extractDP(entitlementRaw, 'timeline_months'),
    irr_impact_pct: extractDP(entitlementRaw, 'irr_impact_pct'),
    carry_cost_monthly: extractDP(entitlementRaw, 'carry_cost_monthly'),
    jurisdiction_risk: extractDP(entitlementRaw, 'jurisdiction_risk'),
    confidence_overall: Number(entitlementRaw.confidence_overall ?? 70),
  } : undefined

  // Quality gate
  const redFlags = [...(narrative.red_flags as string[] ?? [])]
  const activatedCount = skillLogs.filter(l => l.activated).length
  if (activatedCount === 0) redFlags.push('CRITICAL: No skills activated successfully')
  const overallConfidence = Number(narrative.overall_confidence ?? 60)
  if (overallConfidence < 50) redFlags.push(`LOW CONFIDENCE: ${overallConfidence}% — verify before relying`)

  const generationTime = (Date.now() - start) / 1000

  // ── Detailed entitlement analysis + developer profit model ─────────────────
  const entitlementDetailed = (() => {
    try {
      const elig = {
        zone: String(parcelData.zimas_zone_class ?? ''),
        lot_size_sf: Number(parcelData.lot_size_sf ?? 0),
        toc_tier: Number(parcelData.toc_tier ?? 0),
        ed1_eligible: Boolean(parcelData.ed1_eligible ?? true),
        sb9_eligible: (parcelData.sb9_eligible as boolean | null) ?? null,
        ab2011_eligible: (parcelData.ab2011_eligible as boolean | null) ?? null,
        in_hpoz: !!(parcelData.zimas_hpoz_name as string | null),
        in_liquefaction_zone: (parcelData.in_liquefaction_zone as boolean | null) ?? null,
        in_landslide_area: (parcelData.in_landslide_area as boolean | null) ?? null,
        units_by_right: Number(parcelData.max_units_by_right_calc ?? 0),
        units_toc_bonus: Math.max(0, Number(parcelData.max_units_toc_calc ?? 0) - Number(parcelData.max_units_by_right_calc ?? 0)),
        census_median_income: (parcelData.census_median_income as number | null) ?? undefined,
        near_transit: Number(parcelData.toc_tier ?? 0) >= 1,
      }
      return analyzeEntitlement(elig)
    } catch { return undefined }
  })()

  const profitModelData = (() => {
    if (!entitlementDetailed) return undefined
    try {
      const recommendedUnits = entitlementDetailed.recommended_path?.max_units ?? 0
      if (!recommendedUnits) return undefined
      const landPrice = Number(parcelData.last_sale_price ?? 0) || undefined
      return runProfitModel({
        land_price: landPrice ?? (recommendedUnits * 100_000),
        land_price_provided: false,  // orchestrator land price is always estimated, never user-supplied — finance gate active
        buildable_units: recommendedUnits,
        hud_fmr_2br: (parcelData.hud_fmr_2br as number | null) ?? undefined,
        permit_fees: entitlementDetailed.estimated_permit_fees,
      })
    } catch { return undefined }
  })()

  const report: PropertyReport = {
    request_id: requestId,
    address,
    tier: normalizedTier,
    generated_at: now,
    generation_time_seconds: Math.round(generationTime * 10) / 10,
    deal_score: String(narrative.deal_score ?? 'C'),
    deal_score_rationale: String(narrative.deal_score_rationale ?? ''),
    overall_confidence: overallConfidence,
    data_freshness_summary: parcelData.freshness === 'LA_CITY_LIVE' ? 'LA_CITY_LIVE' : 'UNVERIFIED',
    zoning,
    valuation,
    distress,
    climate,
    entitlement,
    entitlement_detailed: entitlementDetailed,
    profit_model_data: profitModelData,
    massing_envelope: (() => {
      try {
        return computeMassing({
          lot_size_sf: (parcelData.lot_size_sf as number | null) ?? null,
          lot_dimensions: {
            width_ft:  (parcelData.land_width_ft  as number | null) ?? undefined,
            depth_ft:  (parcelData.land_depth_ft  as number | null) ?? undefined,
          },
          zoning_code:      String(parcelData.zimas_zone_code ?? '') || null,
          max_far:          (parcelData.zimas_max_far          as number | null) ?? null,
          height_limit_ft:  (parcelData.zimas_height_limit_ft  as number | null) ?? null,
          units_max:        entitlementDetailed?.recommended_path?.max_units ?? null,
          // setbacks: not available from current data sources — gate stays at default 0 with disclaimer
        })
      } catch { return undefined }
    })(),
    executive_summary: String(narrative.executive_summary ?? ''),
    investment_thesis: String(narrative.investment_thesis ?? ''),
    risk_summary: String(narrative.risk_summary ?? ''),
    strategic_recommendations: (narrative.strategic_recommendations as string[]) ?? [],
    red_flags: redFlags,
    skills_activated: skillLogs,
    assumptions: [...new Set(assumptions)],
    unverified_items: [...new Set(unverified)],
    disclaimer:
      'For informational purposes only. Not a licensed appraisal. Not legal advice. ' +
      'Consult a licensed professional before making any real estate or financial decision. © 2026 SevenNova.ai',
    cache_hit: cacheHit,
    source_registry: sourceRegistry,
    manual_review_required: anyManualReview,
    parcel_verified: {
      elevation_ft: (parcelData.elevation_ft as number | null) ?? null,
      transit_nearest_rail_mi: (parcelData.transit_nearest_rail_mi as number | null) ?? null,
      transit_nearest_rail_name: (parcelData.transit_nearest_rail_name as string | null) ?? null,
      transit_score: (parcelData.transit_score as number | null) ?? null,
      rso_in_area: (parcelData.rso_in_area as boolean | null) ?? null,
      rso_label: (parcelData.rso_label as string | null) ?? null,
      rso_status: String(parcelData.rso_status ?? 'UNAVAILABLE'),
      walkability_score: (parcelData.walkability_score as number | null) ?? null,
      walk_grocery_half_mi: (parcelData.walk_grocery_half_mi as number | null) ?? null,
      walk_restaurant_quarter_mi: (parcelData.walk_restaurant_quarter_mi as number | null) ?? null,
      walk_park_quarter_mi: (parcelData.walk_park_quarter_mi as number | null) ?? null,
      walk_status: String(parcelData.walk_status ?? 'UNAVAILABLE'),
      enviro_ci_percentile: (parcelData.enviro_ci_percentile as number | null) ?? null,
      enviro_pollution_percentile: (parcelData.enviro_pollution_percentile as number | null) ?? null,
      enviro_poverty_percentile: (parcelData.enviro_poverty_percentile as number | null) ?? null,
      enviro_diesel_percentile: (parcelData.enviro_diesel_percentile as number | null) ?? null,
      enviro_census_tract: (parcelData.enviro_census_tract as string | null) ?? null,
      enviro_status: String(parcelData.enviro_status ?? 'UNAVAILABLE'),
      epa_facilities_half_mi: (parcelData.epa_facilities_half_mi as number | null) ?? null,
      epa_rcra_hazwaste: (parcelData.epa_rcra_hazwaste as number | null) ?? null,
      epa_significant_violators: (parcelData.epa_significant_violators as number | null) ?? null,
      epa_current_violations: (parcelData.epa_current_violations as number | null) ?? null,
      epa_total_penalties_usd: (parcelData.epa_total_penalties_usd as number | null) ?? null,
      epa_status: String(parcelData.epa_status ?? 'UNAVAILABLE'),
      seismic_risk_label: (parcelData.seismic_risk_label as string | null) ?? null,
      seismic_risk_score: (parcelData.seismic_risk_score as number | null) ?? null,
      permits_5yr: (parcelData.ladbs_permits_5yr as number | null) ?? null,
      permit_types: (parcelData.ladbs_permit_types as string | null) ?? null,
      permit_total_valuation_usd: (parcelData.ladbs_permit_total_valuation_usd as number | null) ?? null,
      permit_has_new_construction: (parcelData.ladbs_permit_has_new_construction as boolean | null) ?? null,
      permit_has_demolition: (parcelData.ladbs_permit_has_demolition as boolean | null) ?? null,
      permit_most_recent_date: (parcelData.ladbs_permit_most_recent_date as string | null) ?? null,
      permits_status: String(parcelData.ladbs_permits_status ?? 'UNAVAILABLE'),
      bls_unemployment_rate: (parcelData.bls_unemployment_rate as number | null) ?? null,
      bls_unemployment_month: (parcelData.bls_unemployment_month as string | null) ?? null,
      bls_cpi_value: (parcelData.bls_cpi_value as number | null) ?? null,
      bls_cpi_month: (parcelData.bls_cpi_month as string | null) ?? null,
      bls_cpi_change_1yr: (parcelData.bls_cpi_change_1yr as number | null) ?? null,
      bls_nonfarm_employment_thousands: (parcelData.bls_nonfarm_employment_thousands as number | null) ?? null,
      bls_employment_month: (parcelData.bls_employment_month as string | null) ?? null,
      bls_api_tier: (parcelData.bls_api_tier as string | null) ?? null,
      bls_status: String(parcelData.bls_status ?? 'UNAVAILABLE'),
      bls_error: (parcelData.bls_error as string | null) ?? null,
      bea_personal_income_millions: (parcelData.bea_personal_income_millions as number | null) ?? null,
      bea_personal_income_year: (parcelData.bea_personal_income_year as string | null) ?? null,
      bea_per_capita_income: (parcelData.bea_per_capita_income as number | null) ?? null,
      bea_per_capita_year: (parcelData.bea_per_capita_year as string | null) ?? null,
      bea_per_capita_change_1yr_pct: (parcelData.bea_per_capita_change_1yr_pct as number | null) ?? null,
      bea_real_gdp_millions: (parcelData.bea_real_gdp_millions as number | null) ?? null,
      bea_gdp_year: (parcelData.bea_gdp_year as string | null) ?? null,
      bea_gdp_change_1yr_pct: (parcelData.bea_gdp_change_1yr_pct as number | null) ?? null,
      bea_status: String(parcelData.bea_status ?? 'UNAVAILABLE'),
      bea_error: (parcelData.bea_error as string | null) ?? null,
      community_plan_area: (parcelData.community_plan_area as string | null) ?? null,
      council_district: (parcelData.council_district as number | null) ?? null,
      council_member: (parcelData.council_member as string | null) ?? null,
      overlays_status: String(parcelData.overlays_status ?? 'UNAVAILABLE'),
      in_liquefaction_zone: (parcelData.in_liquefaction_zone as boolean | null) ?? null,
      in_landslide_area: (parcelData.in_landslide_area as boolean | null) ?? null,
      geo_hazard_status: String(parcelData.geo_hazard_status ?? 'UNAVAILABLE'),
      ed1_eligible: Boolean(parcelData.ed1_eligible ?? true),
      ed1_note: String(parcelData.ed1_note ?? ''),
      sb9_eligible: (parcelData.sb9_eligible as boolean | null) ?? null,
      sb9_note: String(parcelData.sb9_note ?? ''),
      ab2011_eligible: (parcelData.ab2011_eligible as boolean | null) ?? null,
      ab2011_note: String(parcelData.ab2011_note ?? ''),
      hud_fmr_studio: (parcelData.hud_fmr_studio as number | null) ?? null,
      hud_fmr_1br: (parcelData.hud_fmr_1br as number | null) ?? null,
      hud_fmr_2br: (parcelData.hud_fmr_2br as number | null) ?? null,
      hud_fmr_3br: (parcelData.hud_fmr_3br as number | null) ?? null,
      hud_fmr_4br: (parcelData.hud_fmr_4br as number | null) ?? null,
      hud_fmr_year: (parcelData.hud_fmr_year as string | null) ?? null,
      hud_fmr_status: String(parcelData.hud_fmr_status ?? 'UNAVAILABLE'),
      // Census ACS expanded
      census_tract: (parcelData.census_tract as string | null) ?? null,
      census_median_income: (parcelData.census_median_income as number | null) ?? null,
      census_poverty_rate_pct: (parcelData.census_poverty_rate_pct as number | null) ?? null,
      census_total_housing_units: (parcelData.census_total_housing_units as number | null) ?? null,
      census_owner_occupied_pct: (parcelData.census_owner_occupied_pct as number | null) ?? null,
      census_renter_occupied_pct: (parcelData.census_renter_occupied_pct as number | null) ?? null,
      census_median_gross_rent: (parcelData.census_median_gross_rent as number | null) ?? null,
      census_rent_burden_severe_pct: (parcelData.census_rent_burden as number | null) ?? null,
      census_total_population: (parcelData.census_total_population as number | null) ?? null,
      census_median_age: (parcelData.census_median_age as number | null) ?? null,
      census_college_degree_pct: (parcelData.census_college_degree_pct as number | null) ?? null,
      census_unemployment_rate_pct: (parcelData.census_unemployment_rate_pct as number | null) ?? null,
      census_acs_year: (parcelData.census_acs_year as string | null) ?? null,
      census_status: String(parcelData.census_status ?? 'UNAVAILABLE'),
    },
  }

  if (env.SEVENNOVA_KEYS) {
    await env.SEVENNOVA_KEYS.put(reportCacheKey, JSON.stringify({ report, cached_at: Date.now() }))
  }

  // Phase 5 — Audit trail (fire-and-forget, non-blocking)
  storeAuditRecord(env, report, userKey, null).catch(() => {})

  // Manual review queue — store any NEEDS_HUMAN_REVIEW sources, 90-day TTL
  if (env.SEVENNOVA_KEYS && anyManualReview) {
    const reviewSources = sourceRegistry.filter(r => r.status === 'NEEDS_HUMAN_REVIEW')
    env.SEVENNOVA_KEYS.put(
      `review:${requestId}`,
      JSON.stringify({
        audit_id: requestId,
        address: fullAddress,
        user_key: userKey,
        timestamp: now,
        resolved: false,
        sources: reviewSources.map(r => ({ source_name: r.source_name, notes: r.notes, source_url: r.source_url })),
      }),
      { expirationTtl: 86400 * 90 },
    ).catch(() => {})
  }

  // Phase 5 — Monthly usage accounting (separate from rate limiting — billing source of truth)
  if (env.SEVENNOVA_KEYS && userKey !== 'anonymous') {
    const monthKey = `usage:monthly:${userKey}:${now.slice(0, 7)}` // YYYY-MM
    env.SEVENNOVA_KEYS.get(monthKey).then(async (raw: string | null) => {
      const count = raw ? parseInt(raw, 10) : 0
      await env.SEVENNOVA_KEYS.put(monthKey, String(count + 1), { expirationTtl: 86400 * 35 })
    }).catch(() => {})
  }

  // Agent 4: Quality monitor — fire-and-forget, never blocks report return
  if (env.SEVENNOVA_KEYS && overallConfidence < 40) {
    const qualityKey = `quality:low:${requestId}`
    env.SEVENNOVA_KEYS.put(
      qualityKey,
      JSON.stringify({
        request_id: requestId,
        address: fullAddress,
        overall_confidence: overallConfidence,
        skills_failed: skillLogs.filter(l => !l.activated).map(l => l.skill_name),
        timestamp: now,
      }),
    ).catch(() => {})

    // Check if 3+ low-quality reports in the past hour → alert
    env.SEVENNOVA_KEYS.list({ prefix: 'quality:low:' }).then(async (listed: { keys: Array<{ name: string }> }) => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentLow: number[] = []
      for (const key of listed.keys) {
        const raw = await env.SEVENNOVA_KEYS.get(key.name).catch(() => null) as string | null
        if (!raw) continue
        const entry = JSON.parse(raw) as { timestamp?: string }
        if (entry.timestamp && new Date(entry.timestamp).getTime() > oneHourAgo) {
          recentLow.push(new Date(entry.timestamp).getTime())
        }
      }
      if (recentLow.length >= 3) {
        await sendEmail(
          env,
          'dan.issak@gmail.com',
          `[SevenNova] Quality Alert — ${recentLow.length} low-confidence reports in 1 hour`,
          `<h2>SevenNova Quality Alert</h2>
<p>${recentLow.length} reports with overall_confidence &lt; 40% in the past hour.</p>
<p>Latest: <strong>${fullAddress}</strong> — confidence ${overallConfidence}%</p>
<p>Request ID: ${requestId}</p>
<p>Check KV keys with prefix <code>quality:low:</code> for details.</p>`,
        )
      }
    }).catch(() => {})
  }

  return report
}
