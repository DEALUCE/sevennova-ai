/**
 * USGS Seismic Hazard — Design Maps API (ASCE 7-22)
 * Source: USGS Earthquake Hazards Program (public, no key required)
 * Returns mapped spectral acceleration values used in structural engineering.
 * Ss (0.2s) is the primary risk signal for LA properties.
 *
 * LA typical range: Ss 1.5–2.5g (HIGH to VERY HIGH)
 * Reference: https://earthquake.usgs.gov/ws/designmaps/
 */

export interface SeismicResult {
  ss: number | null            // Spectral acceleration, short period (0.2s), g
  s1: number | null            // Spectral acceleration, 1.0s period, g
  pga: number | null           // Peak Ground Acceleration, g
  risk_score: number | null    // 0-100 derived from Ss for report display
  risk_label: string           // 'LOW' | 'LOW-MODERATE' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'UNAVAILABLE'
  site_class: string           // Assumed site class D (stiff soil — conservative default for LA)
  source: string
  source_url: string
  retrieved_at: string
  error?: string
}

const USGS_BASE = 'https://earthquake.usgs.gov/ws/designmaps/asce7-22.json'

export async function fetchSeismic(lat: number, lon: number): Promise<SeismicResult> {
  const now = new Date().toISOString()
  // Site Class D = stiff soil, conservative default appropriate for most of LA basin
  const sourceUrl = `${USGS_BASE}?latitude=${lat}&longitude=${lon}&riskCategory=II&siteClass=D&title=SevenNova`

  try {
    const res = await fetch(sourceUrl, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return unavailable(now, sourceUrl, `USGS HTTP ${res.status}`)
    }

    const data = await res.json() as {
      response?: {
        data?: {
          ss?: number
          s1?: number
          sms?: number
          sm1?: number
          pga?: number
        }
      }
      status?: string
    }

    const d = data.response?.data
    if (!d) {
      return unavailable(now, sourceUrl, 'USGS response missing data block')
    }

    const ss = d.ss ?? null
    const s1 = d.s1 ?? null
    const pga = d.pga ?? null

    // Risk label from Ss — calibrated for LA basin context
    let risk_score: number | null = null
    let risk_label = 'UNAVAILABLE'
    if (ss !== null) {
      if (ss >= 2.0)      { risk_score = 95; risk_label = 'VERY HIGH' }
      else if (ss >= 1.5) { risk_score = 80; risk_label = 'HIGH' }
      else if (ss >= 1.0) { risk_score = 60; risk_label = 'MODERATE' }
      else if (ss >= 0.5) { risk_score = 35; risk_label = 'LOW-MODERATE' }
      else                { risk_score = 15; risk_label = 'LOW' }
    }

    return {
      ss,
      s1,
      pga,
      risk_score,
      risk_label,
      site_class: 'D (stiff soil — conservative default)',
      source: 'USGS Earthquake Hazards Program — ASCE 7-22 Design Maps',
      source_url: sourceUrl,
      retrieved_at: now,
    }
  } catch (e) {
    return unavailable(now, sourceUrl, String(e))
  }
}

function unavailable(now: string, url: string, error: string): SeismicResult {
  return {
    ss: null, s1: null, pga: null,
    risk_score: null,
    risk_label: 'UNAVAILABLE',
    site_class: 'D',
    source: 'USGS Earthquake Hazards Program — ASCE 7-22 Design Maps',
    source_url: url,
    retrieved_at: now,
    error,
  }
}
