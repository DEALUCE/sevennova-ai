/**
 * BLS Local Area Unemployment Statistics + CPI + Employment — LA Metro
 *
 * v2 API (with key): fetches 3 series in one call:
 *   LAUMT064194000000003 — LA-Long Beach-Anaheim unemployment rate
 *   CUUSA421SA0          — CPI All Urban Consumers, LA metro
 *   SMU06310000000000001 — Total nonfarm employment, LA-Long Beach, CA (thousands)
 *
 * v1 API (no key): single series, unemployment only.
 *
 * Secret: BLS_API_KEY via wrangler secret put BLS_API_KEY
 * Source: https://www.bls.gov/developers/api_signature_v2.htm
 */

export interface BLSResult {
  source: 'BLS_LAUS'
  // Unemployment
  unemployment_rate_pct: number | null
  unemployment_month: string | null         // e.g. "March 2026"
  // CPI (v2 only)
  cpi_value: number | null                  // e.g. 317.4
  cpi_month: string | null
  cpi_change_1yr: number | null             // % change vs 12 months prior
  // Employment (v2 only)
  nonfarm_employment_thousands: number | null   // e.g. 4521 (thousands)
  employment_month: string | null
  // Meta
  series_id: string
  metro_area: string
  api_tier: 'v2_key' | 'v1_public'
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const BLS_V2_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'
const BLS_V1_URL = 'https://api.bls.gov/publicAPI/v1/timeseries/data/LAUMT064194000000003'
const SOURCE_URL = 'https://www.bls.gov/lau/'
const METRO = 'Los Angeles-Long Beach-Anaheim, CA'

const SERIES_UNEMPLOYMENT = 'LAUMT064194000000003'
const SERIES_CPI          = 'CUUSA421SA0'
const SERIES_EMPLOYMENT   = 'SMU06310800000000001'  // LA-Long Beach-Anaheim metro (31080) total nonfarm

const CURRENT_YEAR = new Date().getFullYear().toString()
const PRIOR_YEAR   = (new Date().getFullYear() - 1).toString()

export async function fetchUnemployment(apiKey?: string): Promise<BLSResult> {
  const retrievedAt = new Date().toISOString()

  if (apiKey) {
    return fetchBLSv2(apiKey, retrievedAt)
  }
  return fetchBLSv1(retrievedAt)
}

async function fetchBLSv2(apiKey: string, retrievedAt: string): Promise<BLSResult> {
  try {
    const body = JSON.stringify({
      seriesid: [SERIES_UNEMPLOYMENT, SERIES_CPI, SERIES_EMPLOYMENT],
      startyear: PRIOR_YEAR,
      endyear: CURRENT_YEAR,
      calculations: true,
      registrationkey: apiKey,
    })

    const res = await fetch(BLS_V2_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!res.ok) {
      return { ...emptyResult(retrievedAt, 'v2_key'), status: 'ERROR', error: `BLS v2 returned ${res.status}` }
    }

    const data = await res.json() as {
      status?: string
      Results?: {
        series?: Array<{
          seriesID?: string
          data?: Array<{
            year?: string
            periodName?: string
            value?: string
            calculations?: { pct_changes?: { '12'?: string } }
          }>
        }>
      }
    }

    if (data.status !== 'REQUEST_SUCCEEDED') {
      const msg = (data as { message?: string[] }).message?.join('; ') ?? data.status ?? 'unknown'
      return {
        ...emptyResult(retrievedAt, 'v2_key'),
        status: 'ERROR',
        error: `BLS v2: ${msg}`,
      }
    }

    type SeriesData = Array<{
      year?: string; periodName?: string; value?: string
      calculations?: { pct_changes?: { '12'?: string } }
    }>
    const seriesMap: Record<string, SeriesData | undefined> = {}
    for (const s of data.Results?.series ?? []) {
      if (s.seriesID) seriesMap[s.seriesID] = s.data
    }

    const unempLatest    = seriesMap[SERIES_UNEMPLOYMENT]?.[0]
    const cpiLatest      = seriesMap[SERIES_CPI]?.[0]
    const empLatest      = seriesMap[SERIES_EMPLOYMENT]?.[0]

    const rate    = parseFloat(unempLatest?.value ?? '')
    const cpi     = parseFloat(cpiLatest?.value ?? '')
    const emp     = parseFloat(empLatest?.value ?? '')
    const cpiChg  = parseFloat(cpiLatest?.calculations?.pct_changes?.['12'] ?? '')

    return {
      source: 'BLS_LAUS',
      unemployment_rate_pct: isFinite(rate) ? rate : null,
      unemployment_month: unempLatest?.periodName && unempLatest.year
        ? `${unempLatest.periodName} ${unempLatest.year}` : null,
      cpi_value: isFinite(cpi) ? cpi : null,
      cpi_month: cpiLatest?.periodName && cpiLatest.year
        ? `${cpiLatest.periodName} ${cpiLatest.year}` : null,
      cpi_change_1yr: isFinite(cpiChg) ? Math.round(cpiChg * 10) / 10 : null,
      nonfarm_employment_thousands: isFinite(emp) ? emp : null,
      employment_month: empLatest?.periodName && empLatest.year
        ? `${empLatest.periodName} ${empLatest.year}` : null,
      series_id: SERIES_UNEMPLOYMENT,
      metro_area: METRO,
      api_tier: 'v2_key',
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: isFinite(rate) ? 'VERIFIED' : 'UNAVAILABLE',
    }
  } catch (e) {
    return fetchBLSv1(retrievedAt)
  }
}

async function fetchBLSv1(retrievedAt: string): Promise<BLSResult> {
  try {
    const res = await fetch(BLS_V1_URL)
    if (!res.ok) {
      return { ...emptyResult(retrievedAt, 'v1_public'), status: 'ERROR', error: `BLS returned ${res.status}` }
    }

    const data = await res.json() as {
      status?: string
      Results?: { series?: Array<{ data?: Array<{ year?: string; periodName?: string; value?: string }> }> }
    }

    if (data.status !== 'REQUEST_SUCCEEDED') {
      return { ...emptyResult(retrievedAt, 'v1_public'), status: 'UNAVAILABLE', error: `BLS status: ${data.status}` }
    }

    const latest = data.Results?.series?.[0]?.data?.[0]
    if (!latest) {
      return { ...emptyResult(retrievedAt, 'v1_public'), status: 'UNAVAILABLE', error: 'No data points' }
    }

    const rate = parseFloat(latest.value ?? '')
    return {
      source: 'BLS_LAUS',
      unemployment_rate_pct: isFinite(rate) ? rate : null,
      unemployment_month: latest.periodName && latest.year ? `${latest.periodName} ${latest.year}` : null,
      cpi_value: null,
      cpi_month: null,
      cpi_change_1yr: null,
      nonfarm_employment_thousands: null,
      employment_month: null,
      series_id: SERIES_UNEMPLOYMENT,
      metro_area: METRO,
      api_tier: 'v1_public',
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: isFinite(rate) ? 'VERIFIED' : 'UNAVAILABLE',
    }
  } catch (e) {
    return { ...emptyResult(retrievedAt, 'v1_public'), status: 'ERROR', error: String(e) }
  }
}

function emptyResult(retrievedAt: string, tier: 'v2_key' | 'v1_public'): BLSResult {
  return {
    source: 'BLS_LAUS',
    unemployment_rate_pct: null, unemployment_month: null,
    cpi_value: null, cpi_month: null, cpi_change_1yr: null,
    nonfarm_employment_thousands: null, employment_month: null,
    series_id: SERIES_UNEMPLOYMENT, metro_area: METRO,
    api_tier: tier, source_url: SOURCE_URL, retrieved_at: retrievedAt,
    status: 'UNAVAILABLE',
  }
}
