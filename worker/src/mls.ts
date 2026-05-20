/**
 * PHASE 6 — MLS Mock Adapter
 *
 * Interface and schema defined. Adapter always returns UNSUPPORTED.
 * Do NOT scrape MLS. Do NOT fabricate comps.
 *
 * When a verified MLS data source (Redfin API, CoreLogic, ATTOM) is licensed,
 * replace the mock adapter with a real implementation matching this interface.
 */

export interface MLSComp {
  address: string
  sold_date: string
  sold_price: number
  beds: number
  baths: number
  sqft: number
  price_per_sqft: number
  days_on_market: number
  source: string
  mls_id: string
}

export interface MLSResult {
  status: 'SUPPORTED' | 'UNSUPPORTED'
  reason: string
  comps: MLSComp[]
  comp_count: number
  median_price: number | null
  median_ppsf: number | null
}

export async function fetchMLSComps(
  _address: string,
  _zipCode?: string,
  _radius_miles = 0.5,
): Promise<MLSResult> {
  // PHASE 6 BLOCKER: MLS data requires a licensed data feed agreement.
  // Options when ready:
  //   1. CoreLogic Trestle — commercial license
  //   2. ATTOM Data — API key, paid
  //   3. Redfin unofficial API — ToS risk, not recommended
  //
  // Plug the real adapter here. This function signature must be preserved.
  // The real implementation should return status: 'SUPPORTED' with populated comps.
  return {
    status: 'UNSUPPORTED',
    reason: 'UNSUPPORTED — VERIFIED COMPS REQUIRED. MLS data feed not yet licensed. Contact SevenNova to enable verified comparable sales.',
    comps: [],
    comp_count: 0,
    median_price: null,
    median_ppsf: null,
  }
}
