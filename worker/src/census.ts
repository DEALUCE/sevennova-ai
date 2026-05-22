/**
 * US Census Bureau ACS 5-Year Estimates — Direct API
 *
 * Replaces CensusReporter.org proxy with direct census.gov API calls.
 * Requires free Census API key: https://api.census.gov/data/key_signup.html
 *
 * ACS 2023 5-year tables used:
 *   B19013 — Median household income
 *   B17001 — Poverty status
 *   B25001 — Total housing units
 *   B25003 — Tenure (owner vs renter)
 *   B25064 — Median gross rent
 *   B01002 — Median age
 *   B15003 — Educational attainment (25+)
 *   B23025 — Employment status
 *   B01001 — Sex by age (total population)
 *   B25070 — Gross rent as % of household income (rent burden)
 *
 * Secret: CENSUS_API_KEY via wrangler secret put CENSUS_API_KEY
 */

export interface CensusResult {
  source: 'CENSUS_ACS'
  census_tract: string | null           // e.g. "06037212420"
  // Income
  median_household_income: number | null // B19013_001E
  // Poverty
  poverty_rate_pct: number | null        // B17001: below_poverty / total × 100
  // Housing
  total_housing_units: number | null     // B25001_001E
  owner_occupied_pct: number | null      // B25003: owner / (owner+renter) × 100
  renter_occupied_pct: number | null     // B25003: renter / (owner+renter) × 100
  median_gross_rent: number | null       // B25064_001E
  // Rent burden
  rent_burden_severe_pct: number | null  // B25070: 50%+ of income on rent
  // Demographics
  total_population: number | null        // B01001_001E
  median_age: number | null              // B01002_001E
  // Education
  college_degree_pct: number | null      // B15003: BA+grad / total_25+
  // Employment
  unemployment_rate_pct: number | null   // B23025: unemployed / labor_force × 100
  // Meta
  acs_year: string                       // e.g. "2023"
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'PARTIAL' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const ACS_YEAR = '2023'
const SOURCE_URL = 'https://www.census.gov/data/developers/data-sets/acs-5year.html'

// Variables to fetch in one API call
const VARS = [
  'B19013_001E',  // median household income
  'B17001_002E',  // below poverty line count
  'B17001_001E',  // total for poverty denominator
  'B25001_001E',  // total housing units
  'B25003_001E',  // occupied housing units total
  'B25003_002E',  // owner occupied
  'B25003_003E',  // renter occupied
  'B25064_001E',  // median gross rent
  'B25070_010E',  // rent 50%+ of income (severe burden count)
  'B25070_001E',  // total renter households (rent burden denominator)
  'B01001_001E',  // total population
  'B01002_001E',  // median age
  'B15003_022E',  // bachelor's degree count
  'B15003_023E',  // master's degree count
  'B15003_024E',  // professional degree count
  'B15003_025E',  // doctorate count
  'B15003_001E',  // total population 25+ (education denominator)
  'B23025_005E',  // unemployed
  'B23025_002E',  // labor force total (unemployment denominator)
].join(',')

export async function fetchCensusACS(
  state: string,
  county: string,
  tract: string,
  geoid: string,
  apiKey?: string,
): Promise<CensusResult> {
  const retrievedAt = new Date().toISOString()

  if (!apiKey) {
    // Fall back to CensusReporter (keyless) for income + rent burden only
    return fetchCensusReporterFallback(geoid, retrievedAt)
  }

  try {
    const url = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=${VARS}&for=tract:${tract}&in=state:${state}+county:${county}&key=${apiKey}`
    const res = await fetch(url)

    if (!res.ok) {
      return {
        ...(await fetchCensusReporterFallback(geoid, retrievedAt)),
        status: 'ERROR',
        error: `Census API returned ${res.status}`,
      }
    }

    // Response is [[header_row], [data_row]]
    const raw = await res.json() as string[][]
    if (!raw || raw.length < 2) {
      return {
        ...(await fetchCensusReporterFallback(geoid, retrievedAt)),
        status: 'UNAVAILABLE',
        error: 'No ACS data for this tract',
      }
    }

    const headers = raw[0]
    const values = raw[1]
    const get = (varName: string): number | null => {
      const idx = headers.indexOf(varName)
      if (idx === -1) return null
      const v = parseInt(values[idx] ?? '', 10)
      return isNaN(v) || v < 0 ? null : v
    }

    const income        = get('B19013_001E')
    const belowPoverty  = get('B17001_002E')
    const povertyTotal  = get('B17001_001E')
    const housingUnits  = get('B25001_001E')
    const ownerOcc      = get('B25003_002E')
    const renterOcc     = get('B25003_003E')
    const medRent       = get('B25064_001E')
    const rentBurden50  = get('B25070_010E')
    const rentBurdenTot = get('B25070_001E')
    const totalPop      = get('B01001_001E')
    const medianAge     = get('B01002_001E')
    const bach          = get('B15003_022E')
    const masters       = get('B15003_023E')
    const prof          = get('B15003_024E')
    const doc           = get('B15003_025E')
    const eduTotal      = get('B15003_001E')
    const unemployed    = get('B23025_005E')
    const laborForce    = get('B23025_002E')

    const pct = (n: number | null, d: number | null): number | null =>
      n != null && d != null && d > 0 ? Math.round((n / d) * 1000) / 10 : null

    const tenureTotal = ownerOcc != null && renterOcc != null ? ownerOcc + renterOcc : null
    const collegeCount = (bach ?? 0) + (masters ?? 0) + (prof ?? 0) + (doc ?? 0)

    return {
      source: 'CENSUS_ACS',
      census_tract: geoid,
      median_household_income: income,
      poverty_rate_pct: pct(belowPoverty, povertyTotal),
      total_housing_units: housingUnits,
      owner_occupied_pct: pct(ownerOcc, tenureTotal),
      renter_occupied_pct: pct(renterOcc, tenureTotal),
      median_gross_rent: medRent,
      rent_burden_severe_pct: pct(rentBurden50, rentBurdenTot),
      total_population: totalPop,
      median_age: medianAge,
      college_degree_pct: pct(eduTotal ? collegeCount : null, eduTotal),
      unemployment_rate_pct: pct(unemployed, laborForce),
      acs_year: ACS_YEAR,
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: income != null ? 'VERIFIED' : 'PARTIAL',
    }
  } catch (e) {
    return {
      ...(await fetchCensusReporterFallback(geoid, retrievedAt)),
      status: 'ERROR',
      error: String(e),
    }
  }
}

async function fetchCensusReporterFallback(geoid: string, retrievedAt: string): Promise<CensusResult> {
  try {
    const geoId = `14000US${geoid}`
    const res = await fetch(
      `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B19013,B25070&geo_ids=${geoId}`,
    )
    if (!res.ok) return emptyResult(geoid, retrievedAt, 'UNAVAILABLE', 'CensusReporter unavailable')
    const data = await res.json() as {
      data?: Record<string, {
        B19013?: { estimate?: { B19013001?: number } }
        B25070?: { estimate?: { B25070010?: number } }
      }>
    }
    const row = data.data?.[geoId]
    return {
      source: 'CENSUS_ACS',
      census_tract: geoid,
      median_household_income: row?.B19013?.estimate?.B19013001 ?? null,
      poverty_rate_pct: null,
      total_housing_units: null,
      owner_occupied_pct: null,
      renter_occupied_pct: null,
      median_gross_rent: null,
      rent_burden_severe_pct: row?.B25070?.estimate?.B25070010 ?? null,
      total_population: null,
      median_age: null,
      college_degree_pct: null,
      unemployment_rate_pct: null,
      acs_year: 'latest',
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: row ? 'PARTIAL' : 'UNAVAILABLE',
    }
  } catch {
    return emptyResult(geoid, retrievedAt, 'ERROR', 'CensusReporter fetch failed')
  }
}

function emptyResult(geoid: string, retrievedAt: string, status: CensusResult['status'], error: string): CensusResult {
  return {
    source: 'CENSUS_ACS', census_tract: geoid,
    median_household_income: null, poverty_rate_pct: null,
    total_housing_units: null, owner_occupied_pct: null, renter_occupied_pct: null,
    median_gross_rent: null, rent_burden_severe_pct: null,
    total_population: null, median_age: null, college_degree_pct: null,
    unemployment_rate_pct: null,
    acs_year: ACS_YEAR, source_url: SOURCE_URL, retrieved_at: retrievedAt,
    status, error,
  }
}
