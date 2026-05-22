/**
 * HUD Fair Market Rents (FMR) — LA-Long Beach-Anaheim Metro
 *
 * FY2025 FMR by bedroom count for LA metro area.
 * Requires free HUD API token: https://www.huduser.gov/portal/dataset/fmr-api.html
 *
 * Metro area code: METRO31080M31080 (LA-Long Beach-Anaheim, CA HUD FMR area)
 * Fallback: FY2025 static values if API unavailable.
 *
 * Secret: HUD_API_KEY via wrangler secret put HUD_API_KEY
 */

export interface HUDFMRResult {
  source: 'HUD_FMR'
  fmr_studio: number | null
  fmr_1br: number | null
  fmr_2br: number | null
  fmr_3br: number | null
  fmr_4br: number | null
  fiscal_year: string | null
  metro_area: string
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

// FY2025 LA-Long Beach-Anaheim FMR static fallback (HUD published values)
// Source: https://www.huduser.gov/portal/datasets/fmr.html
const FY2025_STATIC: Omit<HUDFMRResult, 'source_url' | 'retrieved_at' | 'status' | 'error'> = {
  source: 'HUD_FMR',
  fmr_studio: 1618,
  fmr_1br: 1873,
  fmr_2br: 2355,
  fmr_3br: 3099,
  fmr_4br: 3406,
  fiscal_year: 'FY2025',
  metro_area: 'Los Angeles-Long Beach-Anaheim, CA',
}

const HUD_API_URL = 'https://www.huduser.gov/hudapi/public/fmr/data/METRO31080M31080'
const SOURCE_URL = 'https://www.huduser.gov/portal/datasets/fmr.html'
const METRO = 'Los Angeles-Long Beach-Anaheim, CA'

export async function fetchHUDFMR(apiKey?: string): Promise<HUDFMRResult> {
  const retrievedAt = new Date().toISOString()

  // No API key → return static FY2025 values labeled as UNAVAILABLE (informational)
  if (!apiKey) {
    return {
      ...FY2025_STATIC,
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: 'UNAVAILABLE',
      error: 'HUD_API_KEY not configured — using FY2025 static fallback values',
    }
  }

  try {
    const res = await fetch(HUD_API_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      return {
        ...FY2025_STATIC,
        source_url: SOURCE_URL,
        retrieved_at: retrievedAt,
        status: 'ERROR',
        error: `HUD API returned ${res.status} — using FY2025 static fallback`,
      }
    }

    const data = await res.json() as {
      data?: {
        basicdata?: Array<{
          Efficiency?: number
          One_Bedroom?: number
          Two_Bedroom?: number
          Three_Bedroom?: number
          Four_Bedroom?: number
          year?: number
        }>
      }
    }

    const bd = data.data?.basicdata?.[0]
    if (!bd) {
      return {
        ...FY2025_STATIC,
        source_url: SOURCE_URL,
        retrieved_at: retrievedAt,
        status: 'UNAVAILABLE',
        error: 'No FMR data in HUD response',
      }
    }

    return {
      source: 'HUD_FMR',
      fmr_studio: bd.Efficiency ?? null,
      fmr_1br: bd.One_Bedroom ?? null,
      fmr_2br: bd.Two_Bedroom ?? null,
      fmr_3br: bd.Three_Bedroom ?? null,
      fmr_4br: bd.Four_Bedroom ?? null,
      fiscal_year: bd.year ? `FY${bd.year}` : 'FY2025',
      metro_area: METRO,
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: 'VERIFIED',
    }
  } catch (e) {
    return {
      ...FY2025_STATIC,
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: 'ERROR',
      error: String(e),
    }
  }
}
