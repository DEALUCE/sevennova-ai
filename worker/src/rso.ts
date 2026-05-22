/**
 * RSO (Rent Stabilization Ordinance) — LA City
 *
 * Queries LA City GeoHub ArcGIS for the RSO service area polygon layer.
 * Returns whether the parcel coordinates fall inside an RSO-covered zone.
 *
 * Source: LA City Housing Department / GeoHub
 * No API key required.
 */

export interface RSOResult {
  source: 'LA_CITY_RSO'
  in_rso_area: boolean
  rso_label: string | null          // e.g. "Rent Stabilization Ordinance"
  retrieved_at: string
  source_url: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

// LA City Housing Dept MapServer — Layer 5: RSO Service Areas
// Confirmed working: returns WILSHIRE for 904 S Ardmore, etc.
const RSO_URL = 'https://maps.lacity.org/lahub/rest/services/Housing_and_Community_Investment_Department/MapServer/5/query'
const RSO_SOURCE_URL = 'https://maps.lacity.org/lahub/rest/services/Housing_and_Community_Investment_Department/MapServer/5'

export async function fetchRSO(lat: number, lon: number): Promise<RSOResult> {
  const retrievedAt = new Date().toISOString()

  try {
    const params = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'RSO_SERVIC,TOOLTIP',
      returnGeometry: 'false',
      f: 'json',
    })

    const res = await fetch(`${RSO_URL}?${params}`)
    if (!res.ok) {
      return {
        source: 'LA_CITY_RSO',
        in_rso_area: false,
        rso_label: null,
        retrieved_at: retrievedAt,
        source_url: RSO_SOURCE_URL,
        status: 'ERROR',
        error: `RSO API returned ${res.status}`,
      }
    }

    const data = await res.json() as {
      features?: Array<{ attributes: Record<string, unknown> }>
      error?: { message?: string }
    }

    // ArcGIS returns an error object if the layer URL is wrong
    if (data.error) {
      return {
        source: 'LA_CITY_RSO',
        in_rso_area: false,
        rso_label: null,
        retrieved_at: retrievedAt,
        source_url: RSO_SOURCE_URL,
        status: 'UNAVAILABLE',
        error: String(data.error.message ?? 'ArcGIS service error'),
      }
    }

    const inRSO = (data.features?.length ?? 0) > 0
    const attrs = data.features?.[0]?.attributes ?? {}
    // TOOLTIP = "WILSHIRE RSO Area", RSO_SERVIC = "WILSHIRE"
    const label = String(attrs.TOOLTIP ?? attrs.RSO_SERVIC ?? '').trim() || null

    return {
      source: 'LA_CITY_RSO',
      in_rso_area: inRSO,
      rso_label: inRSO ? (label ?? 'RSO Service Area') : null,
      retrieved_at: retrievedAt,
      source_url: RSO_SOURCE_URL,
      status: 'VERIFIED',
    }
  } catch (e) {
    return {
      source: 'LA_CITY_RSO',
      in_rso_area: false,
      rso_label: null,
      retrieved_at: retrievedAt,
      source_url: RSO_SOURCE_URL,
      status: 'ERROR',
      error: String(e),
    }
  }
}
