# SevenNova RiskCore — One-Page Pitch

**Verified Los Angeles Property Risk & Zoning Intelligence for Lenders, Developers, and Acquisition Teams**

---

## The Problem

Hard-money lenders and developers in Los Angeles make six and seven-figure decisions using stale PDFs, manual permit pulls, and broker summaries that mix verified facts with educated guesses — without labeling which is which.

A lender funding a $2M bridge loan on a property with 50 active LADBS violations and a VERY HIGH seismic rating (Ss=2.23g) should know that before funding. Today, most don't.

---

## What SevenNova RiskCore Does

RiskCore queries every relevant public-record API for a Los Angeles address and returns a lender-grade Evidence Pack that **clearly separates verified facts from anything else**.

Every field is labeled:
- **VERIFIED** — sourced from a live government API with URL + timestamp
- **UNAVAILABLE** — source failed, human verification required
- **AI ESTIMATE** — model-generated, quarantined, must not be used as primary basis

---

## Verified Data Sources (Live, Every Report)

| Source | What It Tells You |
|--------|------------------|
| LA City ZIMAS | Zoning code, FAR, height limit |
| LADBS | Active code violations (count), permit history |
| FEMA NFHL | Flood zone designation |
| USGS ASCE 7-22 | Seismic spectral acceleration (Ss, S1, PGA) |
| CalFire FHSZ | Fire Hazard Severity Zone |
| US Census ACS5 | Median income, rent burden by tract |
| HUD | Opportunity Zone designation |
| LA City TOC Tiers | Transit Oriented Community bonus eligibility |

---

## Sample Output — 3612 W Jefferson Blvd, LA 90016

```
Zoning Code:          C2-2D-SP          [VERIFIED — ZIMAS, 99%]
Max FAR:              1.5               [VERIFIED — ZIMAS, 99%]
Height Limit:         45 ft             [VERIFIED — ZIMAS, 99%]
Active Violations:    50                [VERIFIED — LADBS, 95%]
Seismic Risk:         VERY HIGH Ss=2.23g [VERIFIED — USGS, 99%]
Fire Hazard Zone:     None (urban)      [VERIFIED — CalFire, 85%]
Opportunity Zone:     YES               [VERIFIED — HUD]
```

No guesses. No fake confidence scores. If the data isn't there, it says UNAVAILABLE.

---

## Who It's For

- **Hard-money lenders** — Due diligence before funding. Know violations, seismic, flood before the term sheet.
- **Private lenders / debt funds** — Underwriting support. Source-backed evidence, not broker summaries.
- **Developers** — Entitlement screening. Zoning, FAR, TOC tier, height limits in 30 seconds.
- **Acquisition teams** — Pre-LOI risk triage. Identify deal-killers before paying for appraisal.
- **Commercial brokers** — Client advisory. Show clients verified data, not impressions.

---

## What It Is NOT

- Not a licensed appraisal
- Not legal advice
- Not an MLS comps product (suppressed until licensed feed available)
- Not a credit decision tool

---

## Pricing (Current Pilot)

| Tier | Price | Reports |
|------|-------|---------|
| One-Off Report | $499 | 1 |
| API Access | $1,500/mo | 25/day |

*Pilot pricing. Subject to change. Contact Dan Issak.*

---

## Contact

**Daniel Issak** — DRE #02037760
theissakgroup@gmail.com · 424-272-5935
SevenNova.ai
