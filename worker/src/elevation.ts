/**
 * USGS Elevation Point Query Service (EPQS) v1
 *
 * Returns ground elevation in feet for any lat/lon in the US.
 * 1-meter resolution NED (National Elevation Dataset).
 * No API key required.
 *
 * Source: https://epqs.nationalmap.gov/v1
 */

export interface ElevationResult {
  source: 'USGS_EPQS'
  elevation_ft: number | null
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const EPQS_URL = 'https://epqs.nationalmap.gov/v1/json'
const EPQS_SOURCE_URL = 'https://epqs.nationalmap.gov/v1'

export async function fetchElevation(lat: number, lon: number): Promise<ElevationResult> {
  const retrievedAt = new Date().toISOString()

  try {
    const params = new URLSearchParams({
      x: String(lon),
      y: String(lat),
      units: 'Feet',
      includeDate: 'false',
    })
    const res = await fetch(`${EPQS_URL}?${params}`)
    if (!res.ok) {
      return {
        source: 'USGS_EPQS',
        elevation_ft: null,
        source_url: EPQS_SOURCE_URL,
        retrieved_at: retrievedAt,
        status: 'ERROR',
        error: `USGS EPQS returned ${res.status}`,
      }
    }

    const data = await res.json() as { value?: number | string }

    // USGS returns -1000000 for ocean / no-data points
    const raw = Number(data.value ?? -1000000)
    if (!isFinite(raw) || raw < -9999) {
      return {
        source: 'USGS_EPQS',
        elevation_ft: null,
        source_url: EPQS_SOURCE_URL,
        retrieved_at: retrievedAt,
        status: 'UNAVAILABLE',
        error: 'No elevation data for these coordinates',
      }
    }

    return {
      source: 'USGS_EPQS',
      elevation_ft: Math.round(raw),
      source_url: EPQS_SOURCE_URL,
      retrieved_at: retrievedAt,
      status: 'VERIFIED',
    }
  } catch (e) {
    return {
      source: 'USGS_EPQS',
      elevation_ft: null,
      source_url: EPQS_SOURCE_URL,
      retrieved_at: retrievedAt,
      status: 'ERROR',
      error: String(e),
    }
  }
}
