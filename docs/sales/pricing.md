# SevenNova RiskCore — Pricing Page

> **NOTE FOR DAN:** This is the pilot pricing per your instruction. Do not change tiers or add new ones without explicit approval. The $499 one-off and $1,500/month API tier are the only active tiers.

---

## Pilot Pricing

### One-Off Evidence Pack — $499

Best for: Lenders and buyers evaluating a single deal.

- 1 verified property Evidence Pack PDF
- All 10 public-record data sources queried live
- ZIMAS zoning, LADBS violations + permits, FEMA flood, USGS seismic, CalFire, Census, HUD, TOC tier
- VERIFIED / UNAVAILABLE / AI ESTIMATE labeling on every field
- Source appendix with URLs and timestamps
- Audit ID for traceability
- Delivered in under 60 seconds

[Get a Report →] (/checkout?tier=one-off)

---

### API Access — $1,500/month

Best for: Lenders, debt funds, and acquisition teams running ongoing deal flow.

Everything in One-Off, plus:
- 25 reports/day
- JSON + PDF output
- REST API with X-API-Key authentication
- Usage dashboard
- Priority support

[Get API Access →] (/checkout?tier=api)

---

## What's Included in Every Report

| Data Point | Source | Status |
|-----------|--------|--------|
| Zoning code, FAR, height limit | LA City ZIMAS | VERIFIED |
| Active code violations | LADBS (live) | VERIFIED |
| Permit history count | LADBS (live) | VERIFIED |
| Seismic risk (Ss, S1, PGA) | USGS ASCE 7-22 | VERIFIED |
| Flood zone | FEMA NFHL | VERIFIED |
| Fire hazard zone | CalFire FHSZ | VERIFIED |
| Opportunity Zone | HUD | VERIFIED |
| Median income / rent burden | Census ACS5 | VERIFIED |
| TOC tier | LA City Planning | VERIFIED (when available) |
| AI valuation estimates | Model output | AI ESTIMATE (quarantined) |
| MLS comps | — | SUPPRESSED (license required) |

---

## What It Is Not

- Not a licensed real estate appraisal
- Not legal advice
- Not a credit decision
- Not a broker price opinion
- Not a replacement for title search

---

## FAQ

**How fast is a report?**
Under 60 seconds for most addresses. Occasionally up to 90 seconds for institutional tier.

**Is the data live or cached?**
Live on first query. Cached for 24 hours. Each field includes a retrieved_at timestamp.

**What if a data source is unavailable?**
The field is labeled UNAVAILABLE with an explanation. We never substitute a guess.

**Does this include MLS comps?**
No. Comparable sales data requires a licensed MLS feed. We suppress this field rather than fabricate it.

**Is this an appraisal?**
No. This is a pre-underwriting evidence pack for deal triage. Your licensed appraiser provides the appraisal.

---

*Pilot pricing. Rates subject to change. Contact Dan Issak at theissakgroup@gmail.com.*
