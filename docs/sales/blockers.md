# SevenNova RiskCore — Known Blockers

All items below are intentionally deferred. Do NOT resolve without Dan's explicit approval.

---

## Active Blockers

### B1 — TOC Tier ArcGIS Endpoint
**Status:** UNAVAILABLE in all reports
**Reason:** LA City GIS published endpoint URL for TOC Eligible Areas v3 could not be confirmed at build time. Attempts return empty results or errors.
**Impact:** TOC tier shows as UNAVAILABLE. Max_units_toc calculation unavailable.
**Fix needed:** Confirm correct endpoint URL from https://geohub.lacity.org (search "TOC Eligible Areas"). Update `worker/src/toc.ts` line: `TOC_FEATURE_URL`.
**Fallback:** Currently implemented — returns UNAVAILABLE, never guesses.

### B2 — Google Street View on PDF Cover
**Status:** Property photo not shown on PDF cover
**Reason:** Requires `GOOGLE_MAPS_API_KEY` secret. Free tier: 28,000 requests/month.
**Fix needed:** `wrangler secret put GOOGLE_MAPS_API_KEY` after obtaining key from Google Cloud Console.
**Fallback:** Cover shows address text only.

### B3 — MLS Comparable Sales
**Status:** SUPPRESSED in all reports
**Reason:** Requires CoreLogic Trestle license, ATTOM Data API license, or direct broker IDX feed. Scraping MLS is prohibited.
**Impact:** Valuation section contains only AI ESTIMATES (quarantined). No comp-based values shown.
**Fix needed:** License CoreLogic Trestle ($500+/mo) or ATTOM Data API.
**Legal note:** Do NOT scrape MLS, Zillow, Redfin, or Realtor.com. Requires attorney review of data licensing terms before integration.

### B4 — ADMIN_SECRET Setup
**Status:** Must be set manually after every new Worker deployment
**Command:** `cd worker && npx wrangler secret put ADMIN_SECRET`
**Value:** 52eaba00-863a-4ba6-95c7-c3366d99a8ee (store in password manager)

### B5 — LA County Assessor API Reliability
**Status:** Frequently returns null for lot_size_sf, year_built
**Impact:** Buildable SF and max_units calculations return UNAVAILABLE for many addresses
**Reason:** The LA County Assessor API endpoint (`assessor.lacounty.gov`) has inconsistent coverage
**Fix:** Research whether LARIAC parcel data (LA Regional Integrated Cadastre) has better coverage. Alternative: direct Assessor query by APN.

### B6 — Disclaimer Language (LEGAL REVIEW REQUIRED)
**Status:** Using placeholder disclaimer
**Location:** `worker/src/orchestrator.ts` report.disclaimer field
**Required action:** California-licensed real estate attorney must review and approve final disclaimer language before public launch.
**Flag:** Do NOT launch publicly without attorney-approved disclaimer.

---

## Deferred (Dan Approval Required)

| Item | Phase | Status |
|------|-------|--------|
| D1 storage migration (KV → D1) | Phase 3 | Design only — no migration |
| Customer pilot outreach | Phase 8 | Dan handles |
| Public launch | Phase 9 | Dan approval required |
| Pricing changes | Phase 9 | Pilot only — see pricing.md |
| Metered billing (Stripe) | Phase 9 | Architecture comments in index.ts only |
| ED1/AB2011 eligibility | Skipped | Legal liability risk — needs attorney |
| RSO coverage API | Quick Win 3 | Skipped per Dan |

---

## Non-Blockers (Self-Resolving)

- Seismic PGA field: USGS sometimes omits PGA; handled gracefully (null not shown)
- Cache hit on second request: 24-hour TTL, normal behavior
- TOC tier on non-TOC addresses: returns "Not in TOC area" which is correct
