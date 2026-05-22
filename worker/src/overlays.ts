/**
 * LA City Overlay Layers
 *
 * Phase 2: Community Plan Area + Council District
 * Phase 3: Liquefaction Zones + Landslide Areas + ED1/SB9/AB2011 (zone-computed)
 *
 * All from LA City lahub / ArcGIS public services. No API key required.
 *
 * Community Plan:    services5.arcgis.com/7nsPwEMP38bSkCjy — Community_Plan_Areas
 * Council District:  maps.lacity.org/lahub — Boundaries/MapServer/13
 * Liquefaction:      maps.lacity.org/lahub — Geotechnical_and_Hydrological_Information/MapServer/5
 * Landslide:         maps.lacity.org/lahub — Geotechnical_and_Hydrological_Information/MapServer/4
 */

export interface OverlaysResult {
  source: 'LA_CITY_OVERLAYS'
  // Phase 2
  community_plan_area: string | null    // e.g. "Wilshire"
  community_plan_num: number | null     // e.g. 1060
  council_district: number | null       // e.g. 10
  council_member: string | null         // e.g. "Heather Hutt"
  council_district_label: string | null // e.g. "10 - Heather Hutt"
  // Phase 3 — Seismic hazard
  in_liquefaction_zone: boolean | null
  in_landslide_area: boolean | null
  geo_hazard_status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const CPA_URL = 'https://services5.arcgis.com/7nsPwEMP38bSkCjy/arcgis/rest/services/Community_Plan_Areas/FeatureServer/0/query'
const CD_URL  = 'https://maps.lacity.org/lahub/rest/services/Boundaries/MapServer/13/query'
const GEO_BASE = 'https://maps.lacity.org/lahub/rest/services/Geotechnical_and_Hydrological_Information/MapServer'
const LIQUE_URL = `${GEO_BASE}/5/query`
const SLIDE_URL = `${GEO_BASE}/4/query`
const SOURCE_URL = 'https://planning.lacity.gov/plans-policies/community-plans'

export async function fetchOverlays(lat: number, lon: number): Promise<OverlaysResult> {
  const retrievedAt = new Date().toISOString()

  const geoParams = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'false',
    f: 'json',
  })

  const [cpaRes, cdRes, liqueRes, slideRes] = await Promise.allSettled([
    fetch(`${CPA_URL}?${new URLSearchParams({ ...Object.fromEntries(geoParams), outFields: 'CPA_NUM,NAME_ALF' })}`),
    fetch(`${CD_URL}?${new URLSearchParams({ ...Object.fromEntries(geoParams), outFields: 'District,NAME,District_Name' })}`),
    fetch(`${LIQUE_URL}?${new URLSearchParams({ ...Object.fromEntries(geoParams), outFields: 'OBJECTID', resultRecordCount: '1' })}`),
    fetch(`${SLIDE_URL}?${new URLSearchParams({ ...Object.fromEntries(geoParams), outFields: 'OBJECTID', resultRecordCount: '1' })}`),
  ])

  let cpaArea: string | null = null
  let cpaNum: number | null = null
  let cdNum: number | null = null
  let cdMember: string | null = null
  let cdLabel: string | null = null
  let inLiquefaction: boolean | null = null
  let inLandslide: boolean | null = null
  let geoHazardStatus: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR' = 'UNAVAILABLE'

  if (cpaRes.status === 'fulfilled' && cpaRes.value.ok) {
    try {
      const d = await cpaRes.value.json() as { features?: Array<{ attributes: Record<string, unknown> }> }
      const a = d.features?.[0]?.attributes
      if (a) {
        cpaArea = String(a.NAME_ALF ?? '').trim() || null
        cpaNum = typeof a.CPA_NUM === 'number' ? a.CPA_NUM : null
      }
    } catch { /* ignore */ }
  }

  if (cdRes.status === 'fulfilled' && cdRes.value.ok) {
    try {
      const d = await cdRes.value.json() as { features?: Array<{ attributes: Record<string, unknown> }> }
      const a = d.features?.[0]?.attributes
      if (a) {
        cdNum = typeof a.District === 'number' ? a.District : null
        cdMember = String(a.NAME ?? '').trim() || null
        cdLabel = String(a.District_Name ?? '').trim() || null
      }
    } catch { /* ignore */ }
  }

  // Liquefaction — presence of any feature = in zone
  if (liqueRes.status === 'fulfilled' && liqueRes.value.ok) {
    try {
      const d = await liqueRes.value.json() as { features?: unknown[] }
      inLiquefaction = Array.isArray(d.features) && d.features.length > 0
      geoHazardStatus = 'VERIFIED'
    } catch { geoHazardStatus = 'ERROR' }
  }

  // Landslide — presence of any feature = in area
  if (slideRes.status === 'fulfilled' && slideRes.value.ok) {
    try {
      const d = await slideRes.value.json() as { features?: unknown[] }
      inLandslide = Array.isArray(d.features) && d.features.length > 0
      if (geoHazardStatus !== 'VERIFIED') geoHazardStatus = 'VERIFIED'
    } catch { if (geoHazardStatus !== 'VERIFIED') geoHazardStatus = 'ERROR' }
  }

  // If both geo queries failed but at least one ran, mark ERROR
  if (inLiquefaction === null && inLandslide === null &&
      (liqueRes.status === 'fulfilled' || slideRes.status === 'fulfilled')) {
    geoHazardStatus = 'ERROR'
  }

  const hasData = cpaArea !== null || cdNum !== null

  return {
    source: 'LA_CITY_OVERLAYS',
    community_plan_area: cpaArea,
    community_plan_num: cpaNum,
    council_district: cdNum,
    council_member: cdMember,
    council_district_label: cdLabel,
    in_liquefaction_zone: inLiquefaction,
    in_landslide_area: inLandslide,
    geo_hazard_status: geoHazardStatus,
    source_url: SOURCE_URL,
    retrieved_at: retrievedAt,
    status: hasData ? 'VERIFIED' : 'UNAVAILABLE',
  }
}

/**
 * Compute ED1 / SB9 / AB2011 eligibility from ZIMAS zone data.
 * No dedicated GIS polygon layers exist for these — eligibility is
 * determined by zone class + parcel attributes already fetched from ZIMAS.
 */
export interface EntitlementEligibility {
  ed1_eligible: boolean           // citywide if 100% affordable — always true as pathway
  ed1_note: string
  sb9_eligible: boolean | null    // requires R1/RD/RS/RE zone + not in HPOZ
  sb9_note: string
  ab2011_eligible: boolean | null // requires C zone (commercial → residential)
  ab2011_note: string
}

export function computeEntitlementEligibility(
  zoneClass: string | null,
  hpozName: string | null,
  inLiquefactionZone: boolean | null,
  inLandslideArea: boolean | null,
): EntitlementEligibility {
  const zone = (zoneClass ?? '').toUpperCase().trim()

  // ED1: Citywide for 100% affordable projects — no geographic exclusion
  const ed1Eligible = true
  const ed1Note = 'Citywide — applies to 100% affordable housing (≥5 units, all ≤80% AMI)'

  // SB9: Single-family residential zones only, not HPOZ, not high-hazard areas
  const isSFZone = /^(R1|RS|RE|RA|RU|RZ)/.test(zone)
  const inHPOZ = !!(hpozName && hpozName.trim().length > 0)
  const highHazard = (inLiquefactionZone === true) || (inLandslideArea === true)
  let sb9Eligible: boolean | null = null
  let sb9Note = ''
  if (!zone) {
    sb9Eligible = null
    sb9Note = 'Zone unknown — cannot determine'
  } else if (!isSFZone) {
    sb9Eligible = false
    sb9Note = `Zone ${zone} is not single-family residential — SB9 not applicable`
  } else if (inHPOZ) {
    sb9Eligible = false
    sb9Note = `In HPOZ (${hpozName}) — SB9 prohibited in historic preservation zones`
  } else if (highHazard) {
    sb9Eligible = false
    sb9Note = 'In liquefaction or landslide zone — SB9 requires hazard study'
  } else {
    sb9Eligible = true
    sb9Note = `${zone} zone qualifies — lot split or duplex conversion eligible`
  }

  // AB2011: Commercial corridors — C1, C2, C4, CM zones
  const isCommercial = /^(C1|C2|C4|CM|CR|C1\.5|C2\.5)/.test(zone)
  let ab2011Eligible: boolean | null = null
  let ab2011Note = ''
  if (!zone) {
    ab2011Eligible = null
    ab2011Note = 'Zone unknown — cannot determine'
  } else if (isCommercial) {
    ab2011Eligible = true
    ab2011Note = `${zone} commercial zone qualifies for residential conversion under AB2011`
  } else {
    ab2011Eligible = false
    ab2011Note = `Zone ${zone} is not a qualifying commercial corridor`
  }

  return { ed1_eligible: ed1Eligible, ed1_note: ed1Note, sb9_eligible: sb9Eligible, sb9_note: sb9Note, ab2011_eligible: ab2011Eligible, ab2011_note: ab2011Note }
}
