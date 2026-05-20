# SevenNova RiskCore — Demo Checklist

Use this checklist for live demos with lenders, developers, or brokers.

---

## Pre-Demo Setup (5 min before)

- [ ] Have a test address ready (use prospect's own deal if possible — most compelling)
- [ ] Have `key_dan_dev` API key loaded
- [ ] Have test-riskcore-3612.pdf open as backup (in case live API is slow)
- [ ] Confirm `https://api.sevennova.ai/health` returns 200
- [ ] Browser tab ready at sevennova.ai

---

## Demo Script (15 minutes)

### 1. Open with the problem (2 min)
- Ask: "How do you currently verify zoning and violations before funding or going under contract?"
- Let them describe their process. Note time and pain points.
- Do NOT pitch yet. Just listen.

### 2. Run a live report (3 min)
- Use their address if they gave one. Otherwise use 3612 W Jefferson Blvd.
- Show the API call or the UI
- Point to the VERIFIED badges as data comes back
- Highlight: zoning code, violation count, seismic risk — all labeled with source URL

### 3. Show what UNAVAILABLE means (1 min)
- Point to any UNAVAILABLE field (e.g. TOC tier if not resolved)
- Explain: "This means the source returned no data. We tell you that rather than guessing."
- Contrast: "Most tools would show an estimate here and not tell you it's a guess."

### 4. Show the AI Estimates section (1 min)
- Scroll to the quarantined AI Estimates section in the PDF
- Explain: "These are model outputs. They're there for context but they're labeled and quarantined. We don't show them in the verified data table."

### 5. Show the source appendix (1 min)
- Show the source appendix at the bottom of the PDF
- Every source has a URL and retrieval timestamp
- "If your underwriter wants to verify, here's exactly where to go"

### 6. Handle objections (3 min)

| Objection | Response |
|-----------|----------|
| "We already use CoStar" | "CoStar gives you market data. This gives you code violations and seismic risk with source citations. Different problem." |
| "Our title company does this" | "Title does recorded liens. This is live code enforcement violations and USGS seismic exposure — neither shows up in title." |
| "Is this an appraisal?" | "No. It's a verified evidence pack for pre-underwriting triage. Your appraiser still does the appraisal." |
| "How current is the data?" | "Live on every query. Each field has a retrieved_at timestamp. LADBS pulls in real time." |
| "What about comps?" | "Comps require a licensed MLS feed. We don't show them until we have that. No fake comps." |

### 7. Close (2 min)
- "Would it help to run this on a deal you're currently looking at?"
- If yes: get address, run it, send PDF within 2 minutes
- If they want access: direct to sevennova.ai or offer pilot API key

---

## Red Flags to Watch For

- Prospect wants "AI valuation" as primary output → wrong customer for this product
- Prospect wants MLS comps → explain it's on the roadmap, suppressed until licensed
- Prospect asks if this replaces their appraiser → clarify: it's pre-underwriting triage, not appraisal replacement

---

## Key Numbers to Have Ready

- LADBS violations on 3612 Jefferson: **50 active**
- Seismic score: **95/100, Ss=2.23g, VERY HIGH**
- Generation time: **under 30 seconds**
- Data sources queried per report: **10 live APIs**
- Fields with VERIFIED status: **4-6 per report** (more as we add sources)

---

## After Demo

- [ ] Send sample PDF for their specific address within 2 hours
- [ ] Follow up in 48 hours if no response
- [ ] Log to CRM: address used, what resonated, objections raised
