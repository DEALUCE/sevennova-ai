import type { Env } from '../orchestrator'
import { generateReport } from '../orchestrator'
import { sendEmail } from './resend'

const TEST_STREET = '3612 W Jefferson Blvd'
const TEST_CITY = 'Los Angeles'
const TEST_STATE = 'CA'
const TEST_ZIP = '90016'
const TEST_LAT = 34.0178
const TEST_LON = -118.3094
const ALERT_EMAIL = 'dan.issak@gmail.com'

interface SourceResult {
  name: string
  ok: boolean
  detail: string
}

async function checkLADBS(): Promise<SourceResult> {
  try {
    const res = await fetch(
      'https://data.lacity.org/resource/hbkd-qubn.json?street_name=JEFFERSON&address_start=3612&$limit=1',
      { headers: { Accept: 'application/json' } },
    )
    const data = await res.json() as unknown[]
    return { name: 'LADBS', ok: res.ok && Array.isArray(data), detail: `${Array.isArray(data) ? data.length : 0} records` }
  } catch (e) {
    return { name: 'LADBS', ok: false, detail: String(e) }
  }
}

async function checkFEMA(): Promise<SourceResult> {
  try {
    const res = await fetch(
      `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=${TEST_LON},${TEST_LAT}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE&f=json`,
    )
    const data = await res.json() as { features?: unknown[] }
    const ok = res.ok && data.features !== undefined
    return { name: 'FEMA', ok, detail: ok ? `zone: ${(data.features?.[0] as Record<string, Record<string, string>>)?.attributes?.FLD_ZONE ?? 'X'}` : 'no response' }
  } catch (e) {
    return { name: 'FEMA', ok: false, detail: String(e) }
  }
}

async function checkCalFire(): Promise<SourceResult> {
  try {
    const res = await fetch(
      `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZSRA_23_3/FeatureServer/0/query?geometry=${TEST_LON},${TEST_LAT}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FHSZ,FHSZ_Description&f=json`,
    )
    const data = await res.json() as { features?: unknown[] }
    const ok = res.ok && data.features !== undefined
    return { name: 'CalFire', ok, detail: ok ? `${data.features?.length ?? 0} hazard zones` : 'no response' }
  } catch (e) {
    return { name: 'CalFire', ok: false, detail: String(e) }
  }
}

async function checkCensus(): Promise<SourceResult> {
  try {
    const geoRes = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${TEST_LON}&y=${TEST_LAT}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`,
    )
    const geoData = await geoRes.json() as { result?: { geographies?: { 'Census Tracts'?: Array<{ GEOID: string }> } } }
    const geoid = geoData.result?.geographies?.['Census Tracts']?.[0]?.GEOID
    if (!geoid) return { name: 'Census', ok: false, detail: 'geocode failed' }
    const res = await fetch(
      `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B19013&geo_ids=14000US${geoid}`,
    )
    const ok = res.ok
    return { name: 'Census', ok, detail: ok ? `tract ${geoid}` : `status ${res.status}` }
  } catch (e) {
    return { name: 'Census', ok: false, detail: String(e) }
  }
}

async function checkHUD(): Promise<SourceResult> {
  try {
    const geoRes = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${TEST_LON}&y=${TEST_LAT}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`,
    )
    const geoData = await geoRes.json() as { result?: { geographies?: { 'Census Tracts'?: Array<{ GEOID: string }> } } }
    const geoid = geoData.result?.geographies?.['Census Tracts']?.[0]?.GEOID
    if (!geoid) return { name: 'HUD', ok: false, detail: 'geocode failed' }
    const res = await fetch(
      `https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/13/query?where=GEOID10%3D'${geoid}'&outFields=GEOID10&f=json`,
    )
    const data = await res.json() as { features?: unknown[]; error?: unknown }
    const ok = res.ok && !data.error
    return { name: 'HUD', ok, detail: ok ? `OZ: ${(data.features?.length ?? 0) > 0}` : `error: ${JSON.stringify(data.error)}` }
  } catch (e) {
    return { name: 'HUD', ok: false, detail: String(e) }
  }
}

async function checkZIMAS(): Promise<SourceResult> {
  try {
    const q = encodeURIComponent(TEST_STREET + ', ' + TEST_CITY + ', ' + TEST_STATE + ' ' + TEST_ZIP)
    const res = await fetch(
      `https://navigate.lacity.org/api/1/Addresses/Geocode?text=${q}&f=json`,
    )
    const ok = res.ok
    return { name: 'ZIMAS', ok, detail: ok ? 'geocode ok' : `status ${res.status}` }
  } catch (e) {
    return { name: 'ZIMAS', ok: false, detail: String(e) }
  }
}

export async function runHealthCheck(env: Env): Promise<void> {
  const started = Date.now()

  // Run all source checks in parallel
  const sources = await Promise.all([
    checkLADBS(),
    checkFEMA(),
    checkCalFire(),
    checkCensus(),
    checkHUD(),
    checkZIMAS(),
  ])

  const failedSources = sources.filter(s => !s.ok)

  // Run a real report to check confidence
  let reportConfidence: number | null = null
  let reportError: string | null = null
  try {
    const report = await generateReport(
      TEST_STREET, TEST_CITY, TEST_STATE, TEST_ZIP,
      undefined, 'basic', undefined, env,
    )
    reportConfidence = report.overall_confidence
  } catch (e) {
    reportError = String(e)
  }

  const confidenceFailed = reportConfidence !== null && reportConfidence < 50
  const healthy = failedSources.length === 0 && !confidenceFailed && !reportError

  const result = {
    timestamp: new Date().toISOString(),
    healthy,
    duration_ms: Date.now() - started,
    sources: sources.reduce((acc, s) => ({ ...acc, [s.name]: { ok: s.ok, detail: s.detail } }), {} as Record<string, { ok: boolean; detail: string }>),
    report_confidence: reportConfidence,
    report_error: reportError,
  }

  if (env.SEVENNOVA_KEYS) {
    await env.SEVENNOVA_KEYS.put('health:latest', JSON.stringify(result))
  }

  if (!healthy && env.RESEND_API_KEY) {
    const failLines = [
      ...failedSources.map(s => `<li><strong>${s.name}</strong> FAILED — ${s.detail}</li>`),
      ...(confidenceFailed ? [`<li>Report confidence ${reportConfidence}% &lt; 50% threshold</li>`] : []),
      ...(reportError ? [`<li>Report generation error: ${reportError}</li>`] : []),
    ].join('')

    await sendEmail(
      env,
      ALERT_EMAIL,
      `[SevenNova] Health Check FAILED — ${failedSources.length} source(s) down`,
      `<h2>SevenNova Health Check Alert</h2>
<p>Daily health check failed at ${result.timestamp}</p>
<ul>${failLines}</ul>
<p>Duration: ${result.duration_ms}ms</p>
<p>Check KV key <code>health:latest</code> for full results.</p>`,
    )
  }
}
