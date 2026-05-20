/**
 * LA City Transit Oriented Communities (TOC) Tier Lookup
 * Source: LA City Planning GeoHub — ArcGIS Feature Service (public, no key required)
 * TOC program: LAMC 12.22 A.31 — density bonus near high-frequency transit
 * Tiers 1-4 based on proximity to major/rapid/local bus or rail
 */

export interface TOCResult {
  tier: number | null          // 1, 2, 3, or 4 (null = not in TOC area)
  tier_label: string
  in_toc_area: boolean
  source: string
  source_url: string
  retrieved_at: string
  error?: string
}

// LA City Planning GeoHub — TOC Eligible Areas
// If this endpoint moves, update URL and re-deploy. Fallback: UNAVAILABLE.
const TOC_FEATURE_URL =
  'https://services1.arcgis.com/XHcaLMmqAgLqrObh/arcgis/rest/services/TOC_Eligible_Areas_3/FeatureServer/0/query'

export async function fetchTOCTier(lat: number, lon: number): Promise<TOCResult> {
  const now = new Date().toISOString()
  const sourceUrl = `${TOC_FEATURE_URL}?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`

  try {
    const res = await fetch(sourceUrl, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return unavailable(now, sourceUrl, `HTTP ${res.status}`)
    }

    const data = await res.json() as {
      features?: Array<{ attributes?: Record<string, unknown> }>
      error?: { message?: string }
    }

    if (data.error) {
      return unavailable(now, sourceUrl, data.error.message ?? 'ArcGIS error')
    }

    if (!data.features?.length) {
      // No features = property is not in any TOC area
      return {
        tier: null,
        tier_label: 'Not in TOC area',
        in_toc_area: false,
        source: 'LA City Planning GeoHub — TOC Eligible Areas',
        source_url: sourceUrl,
        retrieved_at: now,
      }
    }

    const attrs = data.features[0].attributes ?? {}

    // Field names vary by service version — check both conventions
    const tier = (attrs.TIER ?? attrs.Tier ?? attrs.tier ?? null) as number | null
    const tierLabel = (attrs.Tier_Label ?? attrs.TIER_LABEL ?? attrs.tier_label ?? (tier != null ? `Tier ${tier}` : 'Unknown')) as string

    return {
      tier,
      tier_label: String(tierLabel),
      in_toc_area: true,
      source: 'LA City Planning GeoHub — TOC Eligible Areas',
      source_url: sourceUrl,
      retrieved_at: now,
    }
  } catch (e) {
    return unavailable(now, sourceUrl, String(e))
  }
}

function unavailable(now: string, url: string, error: string): TOCResult {
  return {
    tier: null,
    tier_label: 'UNAVAILABLE',
    in_toc_area: false,
    source: 'LA City Planning GeoHub — TOC Eligible Areas',
    source_url: url,
    retrieved_at: now,
    error,
  }
}
