import { SKILL_PROMPTS, NARRATIVE_PROMPT } from './skill-prompts'
import { fetchZoning, type ZimasResult } from './zimas'
import { sendEmail } from './agents/resend'
import { storeAuditRecord } from './audit'
import { fetchTOCTier } from './toc'
import { fetchSeismic } from './seismic'
import { collectSourceRegistry, type SourceResult } from './sources/adapter'

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
  ADMIN_SECRET?: string          // Phase 4 — set via: wrangler secret put ADMIN_SECRET
  GOOGLE_MAPS_API_KEY?: string   // Phase 2 — optional Street View on PDF cover; wrangler secret put GOOGLE_MAPS_API_KEY
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
      max_tokens: 1024,
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

async function fetchAssessor(street: string, _city: string, zipCode?: string) {
  try {
    const q = encodeURIComponent(`${street}${zipCode ? ' ' + zipCode : ''}`)
    const res = await fetch(
      `https://assessor.lacounty.gov/api/assessor/parcel/search?address=${q}&limit=1`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    const data = await res.json() as { results?: Array<Record<string, unknown>> }
    const p = data.results?.[0]
    if (!p) return null
    return {
      lot_size_sf: p.LotSizeSqFt ?? p.lot_size_sqft ?? null,
      year_built: p.YearBuilt ?? p.year_built ?? null,
      last_sale_price: p.LastSaleAmount ?? p.sale_price ?? null,
      last_sale_date: p.LastSaleDate ?? p.sale_date ?? null,
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

async function fetchLADBS(street: string, _zipCode?: string) {
  try {
    const { houseNum, streetName } = parseStreetParts(street)
    const permitUrl = houseNum
      ? `https://data.lacity.org/resource/hbkd-qubn.json?street_name=${encodeURIComponent(streetName)}&address_start=${encodeURIComponent(houseNum)}&$limit=50`
      : `https://data.lacity.org/resource/hbkd-qubn.json?street_name=${encodeURIComponent(streetName)}&$limit=50`
    const violationUrl = `https://data.lacity.org/resource/u82d-eh7z.json?stname=${encodeURIComponent(streetName)}&$limit=50`
    const [permitsRes, violationsRes] = await Promise.all([
      fetch(permitUrl, { headers: { Accept: 'application/json' } }),
      fetch(violationUrl, { headers: { Accept: 'application/json' } }),
    ])
    const permits = permitsRes.ok ? await permitsRes.json() as Array<Record<string, unknown>> : []
    const violations = violationsRes.ok ? await violationsRes.json() as Array<Record<string, unknown>> : []
    // u82d-eh7z: stat='O' means open/active
    const active = violations.filter(r => String(r.stat ?? '').toUpperCase() === 'O')
    return { active_violations: active.length, permit_count: permits.length, violation_count: violations.length }
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

async function fetchCensus(lat: number, lon: number) {
  try {
    const tractInfo = await geocodeToTract(lat, lon)
    if (!tractInfo) return null
    // CensusReporter: keyless API — returns ACS5 B19013 (median income) and B25070 (rent burden)
    const geoId = `14000US${tractInfo.geoid}`
    const res = await fetch(
      `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B19013,B25070&geo_ids=${geoId}`,
    )
    if (!res.ok) return null
    const data = await res.json() as {
      data?: Record<string, {
        B19013?: { estimate?: { B19013001?: number } }
        B25070?: { estimate?: { B25070010?: number } }
      }>
    }
    const row = data.data?.[geoId]
    if (!row) return null
    return {
      median_income: row.B19013?.estimate?.B19013001 ?? null,
      rent_burden_severe_pct: row.B25070?.estimate?.B25070010 ?? null,
      census_tract: tractInfo.geoid,
    }
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
    const [zimasResult, assessorResult] = await Promise.allSettled([
      fetchZoning(street, city, state, zipCode),
      fetchAssessor(street, city, zipCode),
    ])
    const zimasPhase1: ZimasResult | null = zimasResult.status === 'fulfilled' ? zimasResult.value : null
    const lat = zimasPhase1?.lat ?? 34.0522
    const lon = zimasPhase1?.lon ?? -118.2437

    // Phase 2: All geo-dependent fetchers in parallel using resolved lat/lon
    const [ladbsResult, femaResult, calfireResult, censusResult, hudResult, tocResult, seismicResult] =
      await Promise.allSettled([
        fetchLADBS(street, zipCode),
        fetchFEMA(lat, lon),
        fetchCalFire(lat, lon),
        fetchCensus(lat, lon),
        fetchHUD(lat, lon),
        fetchTOCTier(lat, lon),    // Quick win 2 — LA City GIS TOC layer
        fetchSeismic(lat, lon),    // Quick win 4 — USGS ShakeMap
      ])

    const zimas: ZimasResult | null = zimasPhase1
    const assessor = assessorResult.status === 'fulfilled' ? assessorResult.value : null
    const ladbs = ladbsResult.status === 'fulfilled' ? ladbsResult.value : null
    const fema = femaResult.status === 'fulfilled' ? femaResult.value : null
    const calfire = calfireResult.status === 'fulfilled' ? calfireResult.value : null
    const census = censusResult.status === 'fulfilled' ? censusResult.value : null
    const hud = hudResult.status === 'fulfilled' ? hudResult.value : null
    const toc = tocResult.status === 'fulfilled' ? tocResult.value : null
    const seismic = seismicResult.status === 'fulfilled' ? seismicResult.value : null

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
      zimas_lat: zimas?.lat ?? null,
      zimas_lon: zimas?.lon ?? null,
      zimas_source: zimas?.error ? `ZIMAS_ERROR: ${zimas.error}` : (zimas ? 'LA_CITY_ZIMAS_LIVE' : 'UNAVAILABLE'),
      freshness: zimas && !zimas.error ? 'LA_CITY_LIVE' : 'UNVERIFIED',
      confidence: zimas && !zimas.error ? 90 : 0,
      lot_size_sf: assessor?.lot_size_sf ?? null,
      year_built: assessor?.year_built ?? null,
      last_sale_price: assessor?.last_sale_price ?? null,
      last_sale_date: assessor?.last_sale_date ?? null,
      assessor_source: assessor ? 'LA_COUNTY_ASSESSOR_LIVE' : 'UNAVAILABLE',
      ladbs_active_violations: ladbs?.active_violations ?? null,
      ladbs_permit_count: ladbs?.permit_count ?? null,
      ladbs_source: ladbs ? 'LADBS_LIVE' : 'UNAVAILABLE',
      fema_flood_zone: fema?.flood_zone ?? null,
      fema_source: fema ? 'FEMA_LIVE' : 'UNAVAILABLE',
      fire_hazard_zone: calfire?.fire_hazard_zone ?? null,
      calfire_source: calfire ? 'CALFIRE_LIVE' : 'UNAVAILABLE',
      census_median_income: census?.median_income ?? null,
      census_rent_burden: census?.rent_burden_severe_pct ?? null,
      census_tract: census?.census_tract ?? null,
      census_source: census ? 'CENSUS_ACS_LIVE' : 'UNAVAILABLE',
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
