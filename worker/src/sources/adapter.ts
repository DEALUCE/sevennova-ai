import type { ZimasResult } from '../zimas'
import type { SourceClassification } from './registry'

export type SourceType =
  | 'PUBLIC_RECORD'
  | 'AI_INFERENCE'
  | 'OFFICIAL_PORTAL_ONLY'
  | 'API_SUBSCRIPTION_REQUIRED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'PAID_PORTAL'
  | 'MARKET_LEVEL_ONLY'

export type SourceStatus = 'VERIFIED' | 'UNAVAILABLE' | 'AI_ESTIMATE' | 'NEEDS_HUMAN_REVIEW'

export interface SourceResult {
  source_name: string
  source_type: SourceType
  classification: SourceClassification
  status: SourceStatus
  value: unknown
  confidence: number
  source_url: string
  retrieved_at: string
  machine_readable: boolean
  requires_subscription: boolean
  manual_review_required: boolean
  fallback_behavior: string
  notes?: string
}

export interface PrefetchedData {
  zimas?: ZimasResult | null
  ladbs?: { active_violations: number; permit_count: number; violation_count: number } | null
  fema?: { flood_zone: string | null } | null
  calfire?: { fire_hazard_zone: string } | null
  census?: { median_income: number | null; rent_burden_severe_pct: number | null; census_tract: string | null } | null
  hud?: { opportunity_zone: boolean } | null
}

export interface AdapterParams {
  address: string
  street: string
  city: string
  state: string
  zip_code?: string
  lat?: number
  lon?: number
  apn?: string
  prefetched?: PrefetchedData
}

// ── ADAPTER 1: ZIMAS ─────────────────────────────────────────────────────────

export function adaptZimas(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const z = params.prefetched?.zimas
  const url = 'https://maps.lacity.org/lahub/rest/services/City_Planning_Department/MapServer/8'

  if (!z || z.error || z.zone_code === 'UNKNOWN') {
    return {
      source_name: 'LA City ZIMAS',
      source_type: 'PUBLIC_RECORD',
      classification: 'PUBLIC_RECORD',
      status: 'UNAVAILABLE',
      value: null,
      confidence: 0,
      source_url: url,
      retrieved_at: now,
      machine_readable: true,
      requires_subscription: false,
      manual_review_required: false,
      fallback_behavior: 'Returns UNAVAILABLE if ArcGIS or Nominatim geocoder fails.',
      notes: z?.error ?? 'No ZIMAS data returned',
    }
  }

  return {
    source_name: 'LA City ZIMAS',
    source_type: 'PUBLIC_RECORD',
    classification: 'PUBLIC_RECORD',
    status: 'VERIFIED',
    value: {
      zone_code: z.zone_code,
      zone_class: z.zone_class,
      zone_description: z.zone_description,
      max_far: z.max_far,
      height_limit_ft: z.height_limit_ft,
      height_limit_stories: z.height_limit_stories,
      lat: z.lat,
      lon: z.lon,
    },
    confidence: 99,
    source_url: url,
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns UNAVAILABLE if ArcGIS or Nominatim geocoder fails.',
  }
}

// ── ADAPTER 2: LADBS PERMITS ─────────────────────────────────────────────────

export function adaptLADBSPermits(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const ladbs = params.prefetched?.ladbs
  const url = 'https://data.lacity.org/resource/hbkd-qubn.json'

  if (!ladbs) {
    return {
      source_name: 'LADBS Permits',
      source_type: 'PUBLIC_RECORD',
      classification: 'PUBLIC_RECORD',
      status: 'UNAVAILABLE',
      value: null,
      confidence: 0,
      source_url: url,
      retrieved_at: now,
      machine_readable: true,
      requires_subscription: false,
      manual_review_required: false,
      fallback_behavior: 'Returns UNAVAILABLE if Socrata endpoint fails.',
    }
  }

  return {
    source_name: 'LADBS Permits',
    source_type: 'PUBLIC_RECORD',
    classification: 'PUBLIC_RECORD',
    status: 'VERIFIED',
    value: { permit_count: ladbs.permit_count },
    confidence: 95,
    source_url: url,
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns UNAVAILABLE if Socrata endpoint fails.',
  }
}

// ── ADAPTER 3: LADBS VIOLATIONS ──────────────────────────────────────────────

export function adaptLADBSViolations(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const ladbs = params.prefetched?.ladbs
  const url = 'https://data.lacity.org/resource/u82d-eh7z.json'

  if (!ladbs) {
    return {
      source_name: 'LADBS Violations',
      source_type: 'PUBLIC_RECORD',
      classification: 'PUBLIC_RECORD',
      status: 'UNAVAILABLE',
      value: null,
      confidence: 0,
      source_url: url,
      retrieved_at: now,
      machine_readable: true,
      requires_subscription: false,
      manual_review_required: false,
      fallback_behavior: 'Returns UNAVAILABLE if Socrata endpoint fails.',
    }
  }

  return {
    source_name: 'LADBS Violations',
    source_type: 'PUBLIC_RECORD',
    classification: 'PUBLIC_RECORD',
    status: 'VERIFIED',
    value: {
      active_violations: ladbs.active_violations,
      total_violations: ladbs.violation_count,
    },
    confidence: 95,
    source_url: url,
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns UNAVAILABLE if Socrata endpoint fails.',
  }
}

// ── ADAPTER 4: FEMA ──────────────────────────────────────────────────────────

export function adaptFEMA(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const fema = params.prefetched?.fema
  const url = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28'

  if (!fema || fema.flood_zone == null) {
    return {
      source_name: 'FEMA NFHL Flood Zones',
      source_type: 'PUBLIC_RECORD',
      classification: 'PUBLIC_RECORD',
      status: 'UNAVAILABLE',
      value: null,
      confidence: 0,
      source_url: url,
      retrieved_at: now,
      machine_readable: true,
      requires_subscription: false,
      manual_review_required: false,
      fallback_behavior: 'Returns UNAVAILABLE if FEMA ArcGIS endpoint fails.',
    }
  }

  return {
    source_name: 'FEMA NFHL Flood Zones',
    source_type: 'PUBLIC_RECORD',
    classification: 'PUBLIC_RECORD',
    status: 'VERIFIED',
    value: { flood_zone: fema.flood_zone },
    confidence: 99,
    source_url: url,
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns UNAVAILABLE if FEMA ArcGIS endpoint fails.',
  }
}

// ── ADAPTER 5: CALFIRE ───────────────────────────────────────────────────────

export function adaptCalFire(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const calfire = params.prefetched?.calfire
  const url = 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZSRA_23_3/FeatureServer/0'

  if (!calfire) {
    return {
      source_name: 'CalFire FHSZ',
      source_type: 'PUBLIC_RECORD',
      classification: 'PUBLIC_RECORD',
      status: 'UNAVAILABLE',
      value: null,
      confidence: 0,
      source_url: url,
      retrieved_at: now,
      machine_readable: true,
      requires_subscription: false,
      manual_review_required: false,
      fallback_behavior: 'Returns NONE (no SRA designation) for urban parcels. UNAVAILABLE if endpoint fails.',
    }
  }

  return {
    source_name: 'CalFire FHSZ',
    source_type: 'PUBLIC_RECORD',
    classification: 'PUBLIC_RECORD',
    status: 'VERIFIED',
    value: { fire_hazard_zone: calfire.fire_hazard_zone },
    confidence: 85,
    source_url: url,
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns NONE (no SRA designation) for urban parcels. UNAVAILABLE if endpoint fails.',
  }
}

// ── ADAPTER 6: CENSUS + HUD OZ ───────────────────────────────────────────────

export function adaptCensusHUD(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const census = params.prefetched?.census
  const hud = params.prefetched?.hud
  const url = 'https://api.censusreporter.org'

  if (!census && !hud) {
    return {
      source_name: 'Census ACS5 + HUD Opportunity Zones',
      source_type: 'PUBLIC_RECORD',
      classification: 'PUBLIC_RECORD',
      status: 'UNAVAILABLE',
      value: null,
      confidence: 0,
      source_url: url,
      retrieved_at: now,
      machine_readable: true,
      requires_subscription: false,
      manual_review_required: false,
      fallback_behavior: 'Returns UNAVAILABLE if census tract geocode or CensusReporter fails.',
    }
  }

  return {
    source_name: 'Census ACS5 + HUD Opportunity Zones',
    source_type: 'PUBLIC_RECORD',
    classification: 'PUBLIC_RECORD',
    status: 'VERIFIED',
    value: {
      median_income: census?.median_income ?? null,
      rent_burden_severe_pct: census?.rent_burden_severe_pct ?? null,
      census_tract: census?.census_tract ?? null,
      opportunity_zone: hud?.opportunity_zone ?? null,
    },
    confidence: 90,
    source_url: url,
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns UNAVAILABLE if census tract geocode or CensusReporter fails.',
  }
}

// ── ADAPTER 7: LA TREASURER ──────────────────────────────────────────────────
// OFFICIAL_PORTAL_ONLY — no machine-readable API. AIN required, browser-only.

export function adaptLATreasurer(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const apn = params.apn
  const url = apn
    ? `https://ttc.lacounty.gov/proptax/?AIN=${apn.replace(/-/g, '')}`
    : 'https://ttc.lacounty.gov/proptax/'

  return {
    source_name: 'LA County Treasurer Tax Records',
    source_type: 'OFFICIAL_PORTAL_ONLY',
    classification: 'OFFICIAL_PORTAL_ONLY',
    status: 'NEEDS_HUMAN_REVIEW',
    value: null,
    confidence: 0,
    source_url: url,
    retrieved_at: now,
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    fallback_behavior: 'Returns NEEDS_HUMAN_REVIEW with portal URL. No AIN = no lookup.',
    notes: apn
      ? `Manual review required. Open portal URL to pull property tax history for AIN ${apn}.`
      : 'AIN not available. Search by address at ttc.lacounty.gov.',
  }
}

// ── ADAPTER 8: CA SOS UCC ────────────────────────────────────────────────────
// API exists but requires subscription. Mock returns UNAVAILABLE.

export function adaptCASOSUCC(_params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  return {
    source_name: 'CA SOS UCC Filings',
    source_type: 'API_SUBSCRIPTION_REQUIRED',
    classification: 'API_AVAILABLE_BUT_SUBSCRIPTION_REQUIRED',
    status: 'UNAVAILABLE',
    value: null,
    confidence: 0,
    source_url: 'https://bizfileonline.sos.ca.gov/search/ucc',
    retrieved_at: now,
    machine_readable: true,
    requires_subscription: true,
    manual_review_required: false,
    fallback_behavior: 'Returns UNAVAILABLE with note: subscription required.',
    notes: 'CA SOS bulk UCC data requires a data agreement. Individual search is browser-only.',
  }
}

// ── ADAPTER 9: LA RECORDER ───────────────────────────────────────────────────
// MANUAL_REVIEW_REQUIRED — portal-only, no public API.

export function adaptLARecorder(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const apn = params.apn
  const url = apn
    ? `https://assessor.lacounty.gov/selfservice/Search.aspx?q=${apn.replace(/-/g, '')}`
    : 'https://lavote.gov/home/recorder/property-documents'

  return {
    source_name: 'LA County Recorder',
    source_type: 'MANUAL_REVIEW_REQUIRED',
    classification: 'MANUAL_REVIEW_REQUIRED',
    status: 'NEEDS_HUMAN_REVIEW',
    value: null,
    confidence: 0,
    source_url: url,
    retrieved_at: now,
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    fallback_behavior: 'Returns NEEDS_HUMAN_REVIEW with APN search URL.',
    notes: 'Recorded documents (deeds, liens, easements) require manual portal search by APN.',
  }
}

// ── ADAPTER 10: LA SUPERIOR COURT ────────────────────────────────────────────
// PAID_PORTAL — eCourt registration required, no public API.

export function adaptLASuperiorCourt(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  return {
    source_name: 'LA Superior Court Records',
    source_type: 'PAID_PORTAL',
    classification: 'PAID_PORTAL',
    status: 'NEEDS_HUMAN_REVIEW',
    value: null,
    confidence: 0,
    source_url: 'https://www.lacourt.org/casesummary/ui/',
    retrieved_at: now,
    machine_readable: false,
    requires_subscription: true,
    manual_review_required: true,
    fallback_behavior: 'Returns NEEDS_HUMAN_REVIEW with court search URL.',
    notes: `Search by owner entity or address: ${params.address}. Requires eCourt registration.`,
  }
}

// ── ADAPTER 11: CA DEPT OF INSURANCE ─────────────────────────────────────────
// MARKET_LEVEL_ONLY — aggregate LA County/zip signal. Never property-specific.

const LA_HIGH_RISK_ZIPS = new Set([
  '91001', '91011', '91023', '91024', '91042', '91103', '91104', '91105', '91106', '91107',
  '91108', '91203', '90041', '90042', '90065', '91011', '91046', '91040',
  '90290', '90272', '90265', '90049', '90210', '90212',
])

export function adaptCADeptInsurance(params: AdapterParams): SourceResult {
  const now = new Date().toISOString()
  const zip = params.zip_code ?? ''
  const isHighRisk = LA_HIGH_RISK_ZIPS.has(zip)

  return {
    source_name: 'CA Dept of Insurance Market Data',
    source_type: 'MARKET_LEVEL_ONLY',
    classification: 'MARKET_LEVEL_ONLY',
    status: 'VERIFIED',
    value: {
      market_signal: isHighRisk
        ? 'HIGH_RISK_ZONE — Multiple carriers have withdrawn from this zip code. FAIR Plan likely required.'
        : 'STANDARD — LA County market. Verify current carrier availability at time of underwriting.',
      zip_code: zip || 'unknown',
      data_level: 'MARKET_AGGREGATE',
    },
    confidence: isHighRisk ? 75 : 55,
    source_url: 'https://www.insurance.ca.gov/01-consumers/120-company/',
    retrieved_at: now,
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: false,
    fallback_behavior: 'Returns market-level aggregate flag. Never property-specific.',
    notes: 'CDI aggregate data only. Verify property-level coverage with licensed insurance broker.',
  }
}

// ── COLLECT ALL ADAPTERS ──────────────────────────────────────────────────────

export function collectSourceRegistry(params: AdapterParams): SourceResult[] {
  return [
    adaptZimas(params),
    adaptLADBSPermits(params),
    adaptLADBSViolations(params),
    adaptFEMA(params),
    adaptCalFire(params),
    adaptCensusHUD(params),
    adaptLATreasurer(params),
    adaptCASOSUCC(params),
    adaptLARecorder(params),
    adaptLASuperiorCourt(params),
    adaptCADeptInsurance(params),
  ]
}
