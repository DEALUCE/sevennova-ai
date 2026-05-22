/**
 * CalEPA EnviroScreen 4.0 — Environmental + Population Vulnerability
 *
 * Queries CalEPA EnviroScreen via ArcGIS FeatureServer.
 * Service uses WKID 3310 (CA Albers) — spatial queries with WGS84 fail.
 * Workaround: derive census tract from lat/lon via Census TIGERweb geocoder,
 * then query EnviroScreen by tract number.
 *
 * Tract format: 10-digit integer (e.g. 6037212420 = CA+LA+212420)
 * Census GEOID format: 11-digit string with leading zero (e.g. "06037212420")
 *
 * No API key required.
 * Source: https://oehha.ca.gov/calenviroscreen/report/calenviroscreen-40
 */

export interface EnviroScreenResult {
  source: 'CALENVIROSCREEN_4'
  census_tract: string | null        // e.g. "6037212420"
  ci_score_percentile: number | null // CalEnviroScreen composite percentile 0-100
  pollution_percentile: number | null
  pop_char_percentile: number | null
  diesel_percentile: number | null
  traffic_percentile: number | null
  cleanup_sites_percentile: number | null
  haz_waste_percentile: number | null
  poverty_percentile: number | null
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const ENVIRO_URL = 'https://services1.arcgis.com/PCHfdHz4GlDNAhBb/arcgis/rest/services/CalEnviroScreen_4_0_Results_/FeatureServer/0/query'
const CENSUS_GEO_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates'
const SOURCE_URL = 'https://oehha.ca.gov/calenviroscreen/report/calenviroscreen-40'

// Derive census tract (11-digit GEOID) from lat/lon via Census TIGERweb
async function getTractFromCoords(lat: number, lon: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      x: String(lon),
      y: String(lat),
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      layers: 'Census Tracts',
      format: 'json',
    })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    let res: Response
    try {
      res = await fetch(`${CENSUS_GEO_URL}?${params}`, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
    if (!res.ok) return null
    const data = await res.json() as {
      result?: {
        geographies?: {
          'Census Tracts'?: Array<{ GEOID?: string }>
        }
      }
    }
    const tracts = data.result?.geographies?.['Census Tracts']
    if (!tracts?.length) return null
    return tracts[0].GEOID ?? null  // e.g. "06037212420"
  } catch {
    return null
  }
}

// Convert Census GEOID "06037212420" → EnviroScreen tract double 6037212420
function geoidToTract(geoid: string): number {
  // Drop leading zero from state FIPS
  return Number(geoid.replace(/^0/, ''))
}

export async function fetchEnviroScreen(lat: number, lon: number): Promise<EnviroScreenResult> {
  const retrievedAt = new Date().toISOString()

  try {
    // Step 1: Census tract lookup
    const geoid = await getTractFromCoords(lat, lon)
    if (!geoid) {
      return {
        source: 'CALENVIROSCREEN_4',
        census_tract: null,
        ci_score_percentile: null, pollution_percentile: null,
        pop_char_percentile: null, diesel_percentile: null,
        traffic_percentile: null, cleanup_sites_percentile: null,
        haz_waste_percentile: null, poverty_percentile: null,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'UNAVAILABLE',
        error: 'Census tract lookup returned no results',
      }
    }

    const tractNum = geoidToTract(geoid)

    // Step 2: EnviroScreen query by tract
    const params = new URLSearchParams({
      where: `tract=${tractNum}`,
      outFields: 'tract,CIscoreP,PollutionP,PopCharP,dieselP,trafficP,cleanupsP,hazP,povP',
      returnGeometry: 'false',
      f: 'json',
    })

    const res = await fetch(`${ENVIRO_URL}?${params}`)
    if (!res.ok) {
      return {
        source: 'CALENVIROSCREEN_4',
        census_tract: geoid,
        ci_score_percentile: null, pollution_percentile: null,
        pop_char_percentile: null, diesel_percentile: null,
        traffic_percentile: null, cleanup_sites_percentile: null,
        haz_waste_percentile: null, poverty_percentile: null,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'ERROR',
        error: `EnviroScreen returned ${res.status}`,
      }
    }

    const data = await res.json() as {
      features?: Array<{ attributes: Record<string, number | null> }>
      error?: { message?: string }
    }

    if (data.error) {
      return {
        source: 'CALENVIROSCREEN_4',
        census_tract: geoid,
        ci_score_percentile: null, pollution_percentile: null,
        pop_char_percentile: null, diesel_percentile: null,
        traffic_percentile: null, cleanup_sites_percentile: null,
        haz_waste_percentile: null, poverty_percentile: null,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'ERROR',
        error: String(data.error.message ?? 'ArcGIS service error'),
      }
    }

    if (!data.features?.length) {
      return {
        source: 'CALENVIROSCREEN_4',
        census_tract: geoid,
        ci_score_percentile: null, pollution_percentile: null,
        pop_char_percentile: null, diesel_percentile: null,
        traffic_percentile: null, cleanup_sites_percentile: null,
        haz_waste_percentile: null, poverty_percentile: null,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'UNAVAILABLE',
        error: `No EnviroScreen data for tract ${tractNum}`,
      }
    }

    const a = data.features[0].attributes

    function pct(v: number | null | undefined): number | null {
      if (v == null || !isFinite(v)) return null
      return Math.round(v * 10) / 10
    }

    return {
      source: 'CALENVIROSCREEN_4',
      census_tract: geoid,
      ci_score_percentile: pct(a.CIscoreP),
      pollution_percentile: pct(a.PollutionP),
      pop_char_percentile: pct(a.PopCharP),
      diesel_percentile: pct(a.dieselP),
      traffic_percentile: pct(a.trafficP),
      cleanup_sites_percentile: pct(a.cleanupsP),
      haz_waste_percentile: pct(a.hazP),
      poverty_percentile: pct(a.povP),
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: 'VERIFIED',
    }
  } catch (e) {
    return {
      source: 'CALENVIROSCREEN_4',
      census_tract: null,
      ci_score_percentile: null, pollution_percentile: null,
      pop_char_percentile: null, diesel_percentile: null,
      traffic_percentile: null, cleanup_sites_percentile: null,
      haz_waste_percentile: null, poverty_percentile: null,
      source_url: SOURCE_URL, retrieved_at: retrievedAt,
      status: 'ERROR',
      error: String(e),
    }
  }
}
