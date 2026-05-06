import { SKILL_PROMPTS, NARRATIVE_PROMPT } from './skill-prompts'

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
}

export interface DataPoint {
  value: unknown
  confidence: number
  freshness: string
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

export async function generateReport(
  street: string,
  city: string,
  state: string,
  zipCode: string | undefined,
  apn: string | undefined,
  tier: string,
  requesterEmail: string | undefined,
  env: Env,
): Promise<PropertyReport> {
  const start = Date.now()
  const requestId = crypto.randomUUID().replace(/-/g, '')
  const now = new Date().toISOString()

  const addressParts = [street, city, state]
  if (zipCode) addressParts[2] = `${state} ${zipCode}`
  const fullAddress = addressParts.join(', ')

  const address: Address = { street, city, state, zip_code: zipCode, apn, full_address: fullAddress }

  // Geocode: detect commercial/DC zone signals
  const commercialKeywords = ['blvd', 'ave', 'industrial', 'office', 'commercial']
  const isCommercial = commercialKeywords.some(kw => street.toLowerCase().includes(kw))
  const dcZips = new Set(['90245', '90017', '90028', '91731'])
  const isDCZone = zipCode ? dcZips.has(zipCode) : false

  const parcelData = {
    full_address: fullAddress,
    street, city, state,
    zip_code: zipCode ?? null,
    apn: apn ?? null,
    is_commercial: isCommercial,
    is_data_center_zone: isDCZone,
    freshness: 'UNVERIFIED',
    confidence: 70,
  }

  // Skill routing
  const normalizedTier = ['basic', 'full', 'institutional'].includes(tier) ? tier : 'full'
  let skills = [...(TIER_SKILLS[normalizedTier] ?? TIER_SKILLS.full)]
  if (isCommercial && normalizedTier !== 'basic') {
    skills.push('tenant-credit-collapse', 'tenant-demand-signal')
  }
  if (isDCZone && normalizedTier !== 'basic') {
    skills.push('data-center-intelligence')
  }

  // Run skills in batches of 4 — parallel within each batch, sequential across batches
  // Keeps GPU memory pressure manageable for large local models
  const skillResults = await batchedAll(
    skills.map(name => () => runSkill(name, parcelData, env)),
    4,
  )

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
    const raw = await callLLM(
      NARRATIVE_PROMPT,
      `Property: ${fullAddress}\nTier: ${normalizedTier}\nSkill Results:\n${JSON.stringify(condensed, null, 2)}\nAssumptions: ${[...new Set(assumptions)].join('; ')}\nUnverified: ${[...new Set(unverified)].join('; ')}`,
      env,
      'claude-opus-4-5',
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

  const dp = (val: unknown, conf = 70): DataPoint => ({
    value: val ?? null,
    confidence: conf,
    freshness: 'UNVERIFIED',
  })

  const extractDP = (obj: Record<string, unknown> | undefined, key: string): DataPoint => {
    if (!obj) return dp(null)
    const raw = obj[key] as Record<string, unknown> | undefined
    if (!raw) return dp(null)
    return { value: raw.value ?? null, confidence: Number(raw.confidence ?? 70), freshness: String(raw.freshness ?? 'UNVERIFIED') }
  }

  const zoning: ZoningResult | undefined = zoningRaw ? {
    zoning_code: extractDP(zoningRaw, 'zoning_code'),
    permitted_uses: extractDP(zoningRaw, 'permitted_uses'),
    max_far: extractDP(zoningRaw, 'max_far'),
    height_limit_ft: extractDP(zoningRaw, 'height_limit_ft'),
    toc_tier: extractDP(zoningRaw, 'toc_tier'),
    ed1_eligible: extractDP(zoningRaw, 'ed1_eligible'),
    ab2011_eligible: extractDP(zoningRaw, 'ab2011_eligible'),
    rso_covered: extractDP(zoningRaw, 'rso_covered'),
    ladbs_violations: extractDP(zoningRaw, 'ladbs_violations'),
    buildable_sf: extractDP(zoningRaw, 'buildable_sf'),
    max_units_by_right: extractDP(zoningRaw, 'max_units_by_right'),
    max_units_toc: extractDP(zoningRaw, 'max_units_toc'),
    confidence_overall: Number(zoningRaw.confidence_overall ?? 70),
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
    seismic_risk_score: extractDP(climateRaw, 'seismic_risk_score'),
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

  return {
    request_id: requestId,
    address,
    tier: normalizedTier,
    generated_at: now,
    generation_time_seconds: Math.round(generationTime * 10) / 10,
    deal_score: String(narrative.deal_score ?? 'C'),
    deal_score_rationale: String(narrative.deal_score_rationale ?? ''),
    overall_confidence: overallConfidence,
    data_freshness_summary: 'UNVERIFIED',
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
  }
}
