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

interface FetchJsonOk<T>  { ok: true;  status: number; data: T;       detail: string }
interface FetchJsonErr    { ok: false; status: number; data: null;    detail: string }
type FetchJsonResult<T> = FetchJsonOk<T> | FetchJsonErr

// ── Safe JSON fetch with retry ───────────────────────────────────────────────
// Hardens every health-check call against three failure modes that were causing
// false-positive alerts:
//   (a) transient upstream 5xx (Cloudflare 525/530 between Workers and origins)
//   (b) HTML error pages parsed by `res.json()` → SyntaxError that bubbles up
//   (c) network drops / DNS failures returning no response
//
// Retries: 1 (so up to 2 attempts total). Backoff: 750ms. Timeout per attempt: 8s.
export async function fetchJsonSafe<T = unknown>(
  url: string,
  init: RequestInit = {},
  retries = 1,
  backoffMs = 750,
  timeoutMs = 8_000,
): Promise<FetchJsonResult<T>> {
  let lastStatus = 0
  let lastDetail = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      lastStatus = res.status
      const text = await res.text()
      // Try to parse as JSON; if it's HTML/garbage, treat as failure with body preview.
      let parsed: T | null = null
      let parseError: string | null = null
      try {
        parsed = text ? (JSON.parse(text) as T) : null
      } catch (e) {
        parseError = String(e)
      }
      if (res.ok && parsed !== null && parseError === null) {
        return { ok: true, status: res.status, data: parsed, detail: 'ok' }
      }
      // Non-2xx OR non-JSON body: record + retry if attempts remain.
      const bodyPreview = text.replace(/\s+/g, ' ').slice(0, 160)
      lastDetail = parseError
        ? `status ${res.status} non-JSON: ${bodyPreview}`
        : `status ${res.status} body: ${bodyPreview}`
      // Retry only on transient upstream errors: explicit 5xx + 408/429.
      // 4xx (incl. 404) is treated as permanent — no retry, even if body is non-JSON.
      const retryable = res.status >= 500 || res.status === 408 || res.status === 429
      if (!retryable) break
    } catch (e) {
      lastStatus = 0
      lastDetail = `fetch error: ${String(e)}`
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, backoffMs))
  }
  return { ok: false, status: lastStatus, data: null, detail: lastDetail || 'unknown failure' }
}

async function checkLADBS(): Promise<SourceResult> {
  const r = await fetchJsonSafe<unknown[]>(
    'https://data.lacity.org/resource/hbkd-qubn.json?street_name=JEFFERSON&address_start=3612&$limit=1',
    { headers: { Accept: 'application/json' } },
  )
  if (!r.ok) return { name: 'LADBS', ok: false, detail: r.detail }
  return { name: 'LADBS', ok: Array.isArray(r.data), detail: `${Array.isArray(r.data) ? r.data.length : 0} records` }
}

async function checkFEMA(): Promise<SourceResult> {
  // FEMA ArcGIS drops ~2/3 of connections (verified 2026-06-10: resets + CF 525).
  // 4 attempts with 1.5s backoff rides out their load-shedding.
  const r = await fetchJsonSafe<{ features?: Array<{ attributes?: { FLD_ZONE?: string } }> }>(
    `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=${TEST_LON},${TEST_LAT}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE&f=json`,
    {},
    3,
    1_500,
  )
  if (!r.ok) return { name: 'FEMA', ok: false, detail: r.detail }
  if (r.data.features === undefined) return { name: 'FEMA', ok: false, detail: 'malformed response (no features field)' }
  return { name: 'FEMA', ok: true, detail: `zone: ${r.data.features?.[0]?.attributes?.FLD_ZONE ?? 'X'}` }
}

async function checkCalFire(): Promise<SourceResult> {
  const r = await fetchJsonSafe<{ features?: unknown[] }>(
    `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZSRA_23_3/FeatureServer/0/query?geometry=${TEST_LON},${TEST_LAT}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FHSZ,FHSZ_Description&f=json`,
  )
  if (!r.ok) return { name: 'CalFire', ok: false, detail: r.detail }
  if (r.data.features === undefined) return { name: 'CalFire', ok: false, detail: 'malformed response' }
  return { name: 'CalFire', ok: true, detail: `${r.data.features?.length ?? 0} hazard zones` }
}

async function checkCensus(): Promise<SourceResult> {
  const geo = await fetchJsonSafe<{ result?: { geographies?: { 'Census Tracts'?: Array<{ GEOID: string }> } } }>(
    `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${TEST_LON}&y=${TEST_LAT}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`,
  )
  if (!geo.ok) return { name: 'Census', ok: false, detail: `geocode: ${geo.detail}` }
  const geoid = geo.data.result?.geographies?.['Census Tracts']?.[0]?.GEOID
  if (!geoid) return { name: 'Census', ok: false, detail: 'geocode returned no tract' }
  const r = await fetchJsonSafe(
    `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B19013&geo_ids=14000US${geoid}`,
  )
  if (!r.ok) return { name: 'Census', ok: false, detail: r.detail }
  return { name: 'Census', ok: true, detail: `tract ${geoid}` }
}

async function checkHUD(): Promise<SourceResult> {
  const geo = await fetchJsonSafe<{ result?: { geographies?: { 'Census Tracts'?: Array<{ GEOID: string }> } } }>(
    `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${TEST_LON}&y=${TEST_LAT}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`,
  )
  if (!geo.ok) return { name: 'HUD', ok: false, detail: `geocode: ${geo.detail}` }
  const geoid = geo.data.result?.geographies?.['Census Tracts']?.[0]?.GEOID
  if (!geoid) return { name: 'HUD', ok: false, detail: 'geocode returned no tract' }
  const r = await fetchJsonSafe<{ features?: unknown[]; error?: unknown }>(
    `https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/13/query?where=GEOID10%3D'${geoid}'&outFields=GEOID10&f=json`,
  )
  if (!r.ok) return { name: 'HUD', ok: false, detail: r.detail }
  if (r.data.error) return { name: 'HUD', ok: false, detail: `arcgis error: ${JSON.stringify(r.data.error).slice(0, 120)}` }
  return { name: 'HUD', ok: true, detail: `OZ: ${(r.data.features?.length ?? 0) > 0}` }
}

// Renamed from prior misnomer. Hits the real ZIMAS MapServer layer 8 that the
// feasibility engine depends on — replacing the dead navigate.lacity.org endpoint.
async function checkZIMAS(): Promise<SourceResult> {
  const r = await fetchJsonSafe<{ features?: Array<{ attributes?: { ZONE_CMPLT?: string } }> }>(
    `https://maps.lacity.org/lahub/rest/services/City_Planning_Department/MapServer/8/query?geometry=${TEST_LON},${TEST_LAT}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=75&units=esriSRUnit_Foot&outFields=ZONE_CMPLT&returnGeometry=false&f=json`,
  )
  if (!r.ok) return { name: 'ZIMAS', ok: false, detail: r.detail }
  const zone = r.data.features?.[0]?.attributes?.ZONE_CMPLT
  if (!zone) return { name: 'ZIMAS', ok: false, detail: 'no zone returned for test point' }
  return { name: 'ZIMAS', ok: true, detail: `zone: ${zone}` }
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
