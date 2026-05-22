/**
 * EPA ECHO — Environmental Compliance & Hazard Proximity
 *
 * Queries EPA ECHO (Enforcement and Compliance History Online) for
 * regulated facility counts within 0.5 miles of a property.
 *
 * Single API call returns summary counts — no QueryID pagination needed.
 * Metrics returned: total regulated facilities, RCRA hazardous waste handlers,
 * significant violators, current violations, enforcement actions, total penalties.
 *
 * No API key required.
 * Source: https://echo.epa.gov
 */

export interface EPAEchoResult {
  source: 'EPA_ECHO'
  radius_mi: number                       // search radius used
  total_facilities: number                // all regulated facilities within radius
  rcra_hazardous_waste: number            // RCRA hazardous waste handlers
  significant_violators: number           // currently in significant violation
  current_violations: number              // facilities with active violations
  formal_enforcement_actions: number      // formal EPA/state enforcement actions
  total_penalties_usd: number             // total penalties assessed ($)
  tri_toxic_releases: number              // Toxics Release Inventory facilities
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const ECHO_URL = 'https://echodata.epa.gov/echo/echo_rest_services.get_facilities'
const SOURCE_URL = 'https://echo.epa.gov'
const RADIUS_MI = 0.5

export async function fetchEPAEcho(lat: number, lon: number): Promise<EPAEchoResult> {
  const retrievedAt = new Date().toISOString()

  try {
    const params = new URLSearchParams({
      output: 'JSON',
      p_lat: String(lat),
      p_long: String(lon),
      p_radius: String(RADIUS_MI),
    })

    const res = await fetch(`${ECHO_URL}?${params}`)
    if (!res.ok) {
      return {
        source: 'EPA_ECHO',
        radius_mi: RADIUS_MI,
        total_facilities: 0, rcra_hazardous_waste: 0,
        significant_violators: 0, current_violations: 0,
        formal_enforcement_actions: 0, total_penalties_usd: 0,
        tri_toxic_releases: 0,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'ERROR',
        error: `EPA ECHO returned ${res.status}`,
      }
    }

    const data = await res.json() as {
      Results?: {
        QueryRows?: string
        SVRows?: string
        CVRows?: string
        FEARows?: string
        RCRRows?: string
        TRIRows?: string
        TotalPenalties?: string
        Message?: string
      }
    }

    const r = data.Results
    if (!r || r.Message !== 'Success') {
      return {
        source: 'EPA_ECHO',
        radius_mi: RADIUS_MI,
        total_facilities: 0, rcra_hazardous_waste: 0,
        significant_violators: 0, current_violations: 0,
        formal_enforcement_actions: 0, total_penalties_usd: 0,
        tri_toxic_releases: 0,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'UNAVAILABLE',
        error: `Unexpected response: ${r?.Message ?? 'no message'}`,
      }
    }

    // Parse penalty string like "$138,000" → number
    function parsePenalty(s: string | undefined): number {
      if (!s) return 0
      return Number(s.replace(/[$,]/g, '')) || 0
    }

    const total = Number(r.QueryRows ?? 0)

    return {
      source: 'EPA_ECHO',
      radius_mi: RADIUS_MI,
      total_facilities: total,
      rcra_hazardous_waste: Number(r.RCRRows ?? 0),
      significant_violators: Number(r.SVRows ?? 0),
      current_violations: Number(r.CVRows ?? 0),
      formal_enforcement_actions: Number(r.FEARows ?? 0),
      total_penalties_usd: parsePenalty(r.TotalPenalties),
      tri_toxic_releases: Number(r.TRIRows ?? 0),
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: total > 0 ? 'VERIFIED' : 'UNAVAILABLE',
    }
  } catch (e) {
    return {
      source: 'EPA_ECHO',
      radius_mi: RADIUS_MI,
      total_facilities: 0, rcra_hazardous_waste: 0,
      significant_violators: 0, current_violations: 0,
      formal_enforcement_actions: 0, total_penalties_usd: 0,
      tri_toxic_releases: 0,
      source_url: SOURCE_URL, retrieved_at: retrievedAt,
      status: 'ERROR',
      error: String(e),
    }
  }
}
