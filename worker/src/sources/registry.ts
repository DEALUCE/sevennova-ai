export type SourceClassification =
  | 'PUBLIC_RECORD'
  | 'OFFICIAL_PORTAL_ONLY'
  | 'API_AVAILABLE_BUT_SUBSCRIPTION_REQUIRED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'PAID_PORTAL'
  | 'MARKET_LEVEL_ONLY'
  | 'AI_INFERENCE'

export type ImplementationStatus = 'LIVE' | 'MOCK' | 'STUB' | 'REGISTRY_ONLY'

export interface SourceRegistryEntry {
  source_name: string
  official_url: string
  classification: SourceClassification
  machine_readable: boolean
  requires_subscription: boolean
  manual_review_required: boolean
  terms_notes: string
  implementation_status: ImplementationStatus
  fallback_behavior: string
}

export const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  // ── LIVE ADAPTERS (sources 1-6) ─────────────────────────────────────────────
  {
    source_name: 'LA City ZIMAS',
    official_url: 'https://maps.lacity.org/lahub/rest/services/City_Planning_Department/MapServer/8',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'LA City open data — no key required. ArcGIS MapServer endpoint, public.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns UNAVAILABLE if ArcGIS or Nominatim geocoder fails.',
  },
  {
    source_name: 'LADBS Permits',
    official_url: 'https://data.lacity.org/resource/hbkd-qubn.json',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'LA Open Data Portal — Socrata endpoint. No key required. Terms: city open data license.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns UNAVAILABLE if Socrata endpoint fails.',
  },
  {
    source_name: 'LADBS Violations',
    official_url: 'https://data.lacity.org/resource/u82d-eh7z.json',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'LA Open Data Portal — Socrata endpoint. Active violations filtered by stat=O.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns UNAVAILABLE if Socrata endpoint fails.',
  },
  {
    source_name: 'FEMA NFHL Flood Zones',
    official_url: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'FEMA public ArcGIS endpoint. National Flood Hazard Layer layer 28.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns UNAVAILABLE if FEMA ArcGIS endpoint fails.',
  },
  {
    source_name: 'CalFire FHSZ',
    official_url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZSRA_23_3/FeatureServer/0',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'CalFire FHSZ SRA 2023. Urban areas (LRA) return 0 features → NONE designation.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns NONE (no SRA designation) for urban parcels. UNAVAILABLE if endpoint fails.',
  },
  {
    source_name: 'Census ACS5 + HUD Opportunity Zones',
    official_url: 'https://api.censusreporter.org',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'CensusReporter keyless API (ACS 5-year). HUD OZ layer via ArcGIS. Both public.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns UNAVAILABLE if census tract geocode or CensusReporter fails.',
  },
  // ── NEW ADAPTERS (sources 7-11) ──────────────────────────────────────────────
  {
    source_name: 'LA County Treasurer Tax Records',
    official_url: 'https://ttc.lacounty.gov/proptax/',
    classification: 'OFFICIAL_PORTAL_ONLY',
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    terms_notes: 'AIN-based lookup via public portal. No machine-readable API. Browser-only access.',
    implementation_status: 'STUB',
    fallback_behavior: 'Returns NEEDS_HUMAN_REVIEW with portal URL. No AIN = no lookup.',
  },
  {
    source_name: 'CA SOS UCC Filings',
    official_url: 'https://bizfileonline.sos.ca.gov/search/ucc',
    classification: 'API_AVAILABLE_BUT_SUBSCRIPTION_REQUIRED',
    machine_readable: true,
    requires_subscription: true,
    manual_review_required: false,
    terms_notes: 'CA SOS provides bulk UCC data via subscription. Individual search is browser-only. Bulk API requires CA SOS data agreement.',
    implementation_status: 'MOCK',
    fallback_behavior: 'Returns UNAVAILABLE with note: subscription required.',
  },
  {
    source_name: 'LA County Recorder',
    official_url: 'https://lavote.gov/home/recorder/property-documents',
    classification: 'MANUAL_REVIEW_REQUIRED',
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    terms_notes: 'Recorded documents (deeds, liens, easements) require manual portal search by APN. No public API.',
    implementation_status: 'STUB',
    fallback_behavior: 'Returns NEEDS_HUMAN_REVIEW with APN search URL.',
  },
  {
    source_name: 'LA Superior Court Records',
    official_url: 'https://www.lacourt.org/casesummary/ui/',
    classification: 'PAID_PORTAL',
    machine_readable: false,
    requires_subscription: true,
    manual_review_required: true,
    terms_notes: 'Court case search requires registration and potential fees. eCourt portal — no public API.',
    implementation_status: 'STUB',
    fallback_behavior: 'Returns NEEDS_HUMAN_REVIEW with court search URL.',
  },
  {
    source_name: 'CA Dept of Insurance Market Data',
    official_url: 'https://www.insurance.ca.gov/01-consumers/120-company/',
    classification: 'MARKET_LEVEL_ONLY',
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'CDI publishes FAIR Plan and non-renewal aggregate data by county/zip. No property-level API. Market-level signal only.',
    implementation_status: 'LIVE',
    fallback_behavior: 'Returns market-level aggregate flag. Never property-specific.',
  },
  // ── REGISTRY ONLY (sources 12-17) — no adapter code this sprint ─────────────
  {
    source_name: 'LA Metro GTFS Transit',
    official_url: 'https://developer.metro.net/api/',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'Metro GTFS feed — public. Used for transit proximity scoring.',
    implementation_status: 'REGISTRY_ONLY',
    fallback_behavior: 'Not implemented this sprint.',
  },
  {
    source_name: 'HCIDLA Housing Programs',
    official_url: 'https://hcidla2.lacity.org/',
    classification: 'OFFICIAL_PORTAL_ONLY',
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    terms_notes: 'RSO, HAMI, affordable deed restrictions. Portal-only. No public API for property lookups.',
    implementation_status: 'REGISTRY_ONLY',
    fallback_behavior: 'Not implemented this sprint.',
  },
  {
    source_name: 'EPA ECHO Environmental',
    official_url: 'https://echo.epa.gov/',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'EPA ECHO has an open REST API for facility and enforcement data. No key required.',
    implementation_status: 'REGISTRY_ONLY',
    fallback_behavior: 'Not implemented this sprint.',
  },
  {
    source_name: 'LA Office of Historic Resources',
    official_url: 'https://www.laconservancy.org/survey',
    classification: 'PUBLIC_RECORD',
    machine_readable: true,
    requires_subscription: false,
    manual_review_required: false,
    terms_notes: 'LA Historic Resources Survey (SurveyLA). GeoHub ArcGIS layer available.',
    implementation_status: 'REGISTRY_ONLY',
    fallback_behavior: 'Not implemented this sprint.',
  },
  {
    source_name: 'LAHD Rent Registry',
    official_url: 'https://rentregistry.lacity.org/',
    classification: 'OFFICIAL_PORTAL_ONLY',
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    terms_notes: 'RSO registration status. Portal search only — no public API.',
    implementation_status: 'REGISTRY_ONLY',
    fallback_behavior: 'Not implemented this sprint.',
  },
  {
    source_name: 'LADWP Utility Records',
    official_url: 'https://www.ladwp.com/',
    classification: 'OFFICIAL_PORTAL_ONLY',
    machine_readable: false,
    requires_subscription: false,
    manual_review_required: true,
    terms_notes: 'Meter, service address, and capacity data requires account-level access.',
    implementation_status: 'REGISTRY_ONLY',
    fallback_behavior: 'Not implemented this sprint.',
  },
]

export function getRegistryEntry(sourceName: string): SourceRegistryEntry | undefined {
  return SOURCE_REGISTRY.find(e => e.source_name === sourceName)
}
