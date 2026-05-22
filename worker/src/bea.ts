/**
 * BEA (Bureau of Economic Analysis) Regional Data API
 *
 * Fetches for LA County (GeoFIPS 06037):
 *   CAINC1  — Personal Income Summary (line 1 = total personal income, $thousands)
 *   CAINC4  — Personal Income and Employment (line 10 = per capita personal income)
 *   CAGDP9  — Real GDP by county (all industry total)
 *
 * Free API key: https://apps.bea.gov/api/signup/
 * Secret: BEA_API_KEY via wrangler secret put BEA_API_KEY
 * Docs: https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf
 */

export interface BEAResult {
  source: 'BEA_REGIONAL'
  // Personal income (CAINC1)
  personal_income_millions: number | null     // Total personal income, $millions
  personal_income_year: string | null
  // Per capita income (CAINC4)
  per_capita_income: number | null            // Per capita personal income, $
  per_capita_year: string | null
  per_capita_change_1yr_pct: number | null    // YoY % change
  // GDP (CAGDP9)
  real_gdp_millions: number | null            // Real GDP, $millions chained 2017 dollars
  gdp_year: string | null
  gdp_change_1yr_pct: number | null
  // Meta
  geo_fips: string
  county_name: string
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'PARTIAL' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const BEA_BASE = 'https://apps.bea.gov/api/data'
const GEO_FIPS = '06037'   // LA County
const COUNTY   = 'Los Angeles County, CA'
const SOURCE_URL = 'https://apps.bea.gov/regional/'

// County-level data typically lags 1-2 years; request 2021-2023 to ensure availability
const YEAR_RANGE = '2021,2022,2023'

export async function fetchBEA(apiKey?: string): Promise<BEAResult> {
  const retrievedAt = new Date().toISOString()

  if (!apiKey) {
    return {
      ...emptyResult(retrievedAt),
      status: 'UNAVAILABLE',
      error: 'BEA_API_KEY not configured — wrangler secret put BEA_API_KEY',
    }
  }

  const [incomeRes, perCapitaRes, gdpRes] = await Promise.allSettled([
    fetchBEATable(apiKey, 'CAINC1', '1', YEAR_RANGE),   // Total personal income ($thousands)
    fetchBEATable(apiKey, 'CAINC30', '1', YEAR_RANGE),  // Per capita personal income ($)
    fetchBEATable(apiKey, 'CAGDP9', '1', YEAR_RANGE),   // Real GDP all industries ($millions, 2017$)
  ])

  const valid = (r: BEATableResult | null) => r && r.currentVal > 0 ? r : null
  const income    = incomeRes.status === 'fulfilled' ? valid(incomeRes.value) : null
  const perCapita = perCapitaRes.status === 'fulfilled' ? valid(perCapitaRes.value) : null
  const gdp       = gdpRes.status === 'fulfilled' ? valid(gdpRes.value) : null

  const hasAny = income !== null || perCapita !== null || gdp !== null

  // Collect debug errors from failed tables
  const allResults = [incomeRes, perCapitaRes, gdpRes]
  const debugError = !hasAny
    ? allResults.map(r => {
        if (r.status === 'rejected') return String(r.reason)
        if (!r.value) return 'null result'
        return (r.value as BEATableResult).debugError ?? null
      }).filter(Boolean).join(' | ') || 'all tables returned null'
    : undefined

  return {
    source: 'BEA_REGIONAL',
    personal_income_millions: income?.currentVal ?? null,
    personal_income_year: income?.currentYear ?? null,
    per_capita_income: perCapita?.currentVal ?? null,
    per_capita_year: perCapita?.currentYear ?? null,
    per_capita_change_1yr_pct: perCapita && perCapita.priorVal && perCapita.currentVal
      ? Math.round(((perCapita.currentVal - perCapita.priorVal) / perCapita.priorVal) * 1000) / 10
      : null,
    real_gdp_millions: gdp?.currentVal ?? null,
    gdp_year: gdp?.currentYear ?? null,
    gdp_change_1yr_pct: gdp && gdp.priorVal && gdp.currentVal
      ? Math.round(((gdp.currentVal - gdp.priorVal) / gdp.priorVal) * 1000) / 10
      : null,
    geo_fips: GEO_FIPS,
    county_name: COUNTY,
    source_url: SOURCE_URL,
    retrieved_at: retrievedAt,
    status: hasAny ? 'VERIFIED' : 'UNAVAILABLE',
    error: debugError,
  }
}

interface BEATableResult {
  currentVal: number
  currentYear: string
  priorVal: number | null
  priorYear: string | null
  debugError?: string
}

async function fetchBEATable(
  apiKey: string,
  tableName: string,
  lineCode: string,
  yearRange: string,
): Promise<BEATableResult | null> {
  try {
    const params = new URLSearchParams({
      UserID: apiKey,
      method: 'GetData',
      datasetname: 'Regional',
      TableName: tableName,
      LineCode: lineCode,
      GeoFIPS: GEO_FIPS,
      Year: yearRange,
      ResultFormat: 'JSON',
    })

    const res = await fetch(`${BEA_BASE}?${params}`)
    if (!res.ok) return { currentVal: 0, currentYear: '', priorVal: null, priorYear: null, debugError: `HTTP ${res.status}` }

    const json = await res.json() as {
      BEAAPI?: {
        Results?: {
          Data?: Array<{ TimePeriod?: string; DataValue?: string; GeoName?: string }>
          Error?: string
        }
        Error?: { APIErrorDescription?: string; APIErrorCode?: string }
      }
    }

    const apiError = json.BEAAPI?.Error?.APIErrorDescription ?? json.BEAAPI?.Results?.Error
    if (apiError) return { currentVal: 0, currentYear: '', priorVal: null, priorYear: null, debugError: `BEA ${tableName}: ${apiError}` }

    const rows = json.BEAAPI?.Results?.Data ?? []
    if (rows.length === 0) return { currentVal: 0, currentYear: '', priorVal: null, priorYear: null, debugError: `BEA ${tableName}: empty data` }

    // Filter to LA County rows only, sort descending by year
    const laRows = rows.filter(r => r.GeoName?.includes('Los Angeles') || !r.GeoName)
    const targetRows = laRows.length > 0 ? laRows : rows

    const sorted = targetRows
      .filter(r => r.TimePeriod && r.DataValue)
      .map(r => ({
        year: r.TimePeriod!,
        val: parseFloat((r.DataValue ?? '').replace(/,/g, '')),
      }))
      .filter(r => isFinite(r.val) && r.val > 0)
      .sort((a, b) => b.year.localeCompare(a.year))

    if (sorted.length === 0) return null

    return {
      currentVal: sorted[0].val,
      currentYear: sorted[0].year,
      priorVal: sorted[1]?.val ?? null,
      priorYear: sorted[1]?.year ?? null,
    }
  } catch (e) {
    return { currentVal: 0, currentYear: '', priorVal: null, priorYear: null, debugError: String(e) }
  }
}

function emptyResult(retrievedAt: string): BEAResult {
  return {
    source: 'BEA_REGIONAL',
    personal_income_millions: null, personal_income_year: null,
    per_capita_income: null, per_capita_year: null, per_capita_change_1yr_pct: null,
    real_gdp_millions: null, gdp_year: null, gdp_change_1yr_pct: null,
    geo_fips: GEO_FIPS, county_name: COUNTY,
    source_url: SOURCE_URL, retrieved_at: retrievedAt, status: 'UNAVAILABLE',
  }
}
