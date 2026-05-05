import type {
  PropertyReport, ZoningResult, ValuationResult,
  DistressResult, ClimateResult, EntitlementResult, DataPoint,
} from './orchestrator'

const fmt = (n: unknown): string => Math.round(Number(n)).toLocaleString('en-US')
const fmtPct = (n: unknown): string => `${Math.round(Number(n))}%`
const fmtDec = (n: unknown, d = 1): string => Number(n).toFixed(d)
const scoreColor = (s: string) =>
  ['A+', 'A'].includes(s) ? 'linear-gradient(135deg,#00e5a0,#00b37d)'
    : ['B+', 'B'].includes(s) ? 'linear-gradient(135deg,#00d4ff,#0099cc)'
    : s === 'C' ? 'linear-gradient(135deg,#f0b429,#cc8800)'
    : 'linear-gradient(135deg,#f97316,#ef4444)'

const dp = (d: DataPoint | undefined): string => String(d?.value ?? '—')
const dpConf = (d: DataPoint | undefined): number => Number(d?.confidence ?? 0)

function renderZoning(z: ZoningResult): string {
  return `
<div class="section">
  <div class="section-header">
    <div class="section-num">02</div>
    <div class="section-title">Zoning &amp; Development Intelligence</div>
  </div>
  <div class="cards-4">
    <div class="card card-accent">
      <div class="card-label">Zoning Code</div>
      <div class="card-value" style="font-size:18px">${dp(z.zoning_code)}</div>
      <div class="card-sub"><span class="badge badge-${dpConf(z.zoning_code) >= 80 ? 'green' : 'yellow'}">${fmtPct(dpConf(z.zoning_code))} conf</span></div>
    </div>
    <div class="card">
      <div class="card-label">Max FAR</div>
      <div class="card-value" style="font-size:18px">${dp(z.max_far)}</div>
      <div class="card-sub">Floor-area ratio</div>
    </div>
    <div class="card">
      <div class="card-label">Height Limit</div>
      <div class="card-value" style="font-size:18px">${dp(z.height_limit_ft)} ft</div>
      <div class="card-sub">Estimated</div>
    </div>
    <div class="card">
      <div class="card-label">Max Units (TOC)</div>
      <div class="card-value" style="font-size:18px">${dp(z.max_units_toc)}</div>
      <div class="card-sub">With density bonus</div>
    </div>
  </div>
  <table class="data-table">
    <thead><tr><th>Parameter</th><th>Value</th><th>Pathway</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>TOC Tier</td><td class="mono">${dp(z.toc_tier)}</td><td>TOC Program</td><td><span class="badge badge-${dp(z.toc_tier) !== 'None' ? 'green' : 'red'}">${dp(z.toc_tier) !== 'None' ? 'Eligible' : 'Not Eligible'}</span></td></tr>
      <tr><td>ED1 Eligible</td><td class="mono">${dp(z.ed1_eligible)}</td><td>Executive Directive 1</td><td><span class="badge badge-${z.ed1_eligible?.value ? 'green' : 'red'}">${z.ed1_eligible?.value ? 'Yes' : 'No'}</span></td></tr>
      <tr><td>AB2011 Eligible</td><td class="mono">${dp(z.ab2011_eligible)}</td><td>Commercial→Residential</td><td><span class="badge badge-${z.ab2011_eligible?.value ? 'green' : 'red'}">${z.ab2011_eligible?.value ? 'Yes' : 'No'}</span></td></tr>
      <tr><td>RSO Coverage</td><td class="mono">${dp(z.rso_covered)}</td><td>Rent Stabilization</td><td><span class="badge badge-${z.rso_covered?.value ? 'red' : 'green'}">${z.rso_covered?.value ? 'Applies' : 'No RSO'}</span></td></tr>
      <tr><td>LADBS Violations</td><td class="mono">${dp(z.ladbs_violations)}</td><td>LADBS</td><td><span class="badge badge-${String(z.ladbs_violations?.value ?? '').toLowerCase().includes('active') ? 'red' : 'green'}">${String(z.ladbs_violations?.value ?? '').toLowerCase().includes('active') ? 'Active' : 'Clear'}</span></td></tr>
      <tr><td>Buildable SF</td><td class="mono">${fmt(z.buildable_sf?.value)}</td><td>FAR × Lot</td><td><span class="badge badge-unverified">Estimate</span></td></tr>
      <tr><td>Units (By-Right)</td><td class="mono">${dp(z.max_units_by_right)}</td><td>No bonus</td><td><span class="badge badge-blue">Base</span></td></tr>
    </tbody>
  </table>
</div>`
}

function renderValuation(v: ValuationResult): string {
  return `
<div class="section">
  <div class="section-header">
    <div class="section-num">03</div>
    <div class="section-title">Ensemble Valuation &amp; Climate-Adjusted AVM</div>
  </div>
  <div class="cards-4">
    <div class="card card-accent">
      <div class="card-label">Ensemble Estimate</div>
      <div class="card-value">$${fmt(v.ensemble_estimate?.value)}</div>
      <div class="card-sub">XGB+LGB+CatBoost blend</div>
    </div>
    <div class="card card-red">
      <div class="card-label">Legal Value</div>
      <div class="card-value" style="color:var(--red)">$${fmt(v.legal_value?.value)}</div>
      <div class="card-sub">As-is, legal units only</div>
    </div>
    <div class="card card-gold">
      <div class="card-label">Climate-Adjusted</div>
      <div class="card-value" style="color:var(--gold)">$${fmt(v.climate_adjusted_value?.value)}</div>
      <div class="card-sub">After climate haircut</div>
    </div>
    <div class="card">
      <div class="card-label">Cap Rate</div>
      <div class="card-value">${fmtDec(Number(v.cap_rate?.value ?? 0) * 100)}%</div>
      <div class="card-sub">Submarket estimate</div>
    </div>
  </div>
  ${v.diminution_estimate ? `
  <div style="background:rgba(255,71,87,0.06);border:1px solid rgba(255,71,87,0.25);border-left:4px solid var(--red);border-radius:6px;padding:14px 18px;margin-top:12px">
    <div style="font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;font-family:var(--mono);margin-bottom:4px">Diminution of Value</div>
    <div style="font-size:28px;font-weight:700;color:var(--red);font-family:var(--mono)">$${fmt(v.diminution_estimate.value)}</div>
    <div style="font-size:12px;color:#fca5a5;margin-top:4px">Potential litigation recovery basis</div>
  </div>` : ''}
</div>`
}

function renderDistress(d: DistressResult): string {
  const score = Number(d.distress_score?.value ?? 0)
  const scoreClass = score >= 70 ? 'red' : score >= 40 ? 'gold' : 'green'
  const dscr = Number(d.dscr_estimate?.value ?? 1.5)
  const dscrClass = dscr < 1.0 ? 'red' : 'green'
  const ladbs = Boolean(d.ladbs_order_active?.value)
  return `
<div class="section">
  <div class="section-header">
    <div class="section-num">04</div>
    <div class="section-title">Distressed Asset Radar</div>
  </div>
  <div class="cards-4">
    <div class="card card-${scoreClass}">
      <div class="card-label">Distress Score</div>
      <div class="card-value">${score}/100</div>
      <div class="card-sub">${score >= 70 ? 'HIGH DISTRESS' : score >= 40 ? 'MEDIUM' : 'LOW'}</div>
    </div>
    <div class="card card-${dscrClass}">
      <div class="card-label">DSCR Estimate</div>
      <div class="card-value" style="color:var(--${dscrClass})">${fmtDec(dscr, 2)}</div>
      <div class="card-sub">Min 1.25 required</div>
    </div>
    <div class="card">
      <div class="card-label">Event Window</div>
      <div class="card-value">${dp(d.event_window_months)}mo</div>
      <div class="card-sub">Distress timeline</div>
    </div>
    <div class="card card-${ladbs ? 'red' : 'green'}">
      <div class="card-label">LADBS Order</div>
      <div class="card-value" style="font-size:16px;color:var(--${ladbs ? 'red' : 'green'})">${ladbs ? 'ACTIVE' : 'CLEAR'}</div>
      <div class="card-sub">Code violation status</div>
    </div>
  </div>
</div>`
}

function renderEntitlement(e: EntitlementResult): string {
  const irr = Number(e.irr_impact_pct?.value ?? 0)
  const irrClass = irr < -3 ? 'red' : 'gold'
  return `
<div class="section">
  <div class="section-header">
    <div class="section-num">05</div>
    <div class="section-title">Entitlement Velocity</div>
  </div>
  <div class="cards-4">
    <div class="card card-accent">
      <div class="card-label">Best Pathway</div>
      <div class="card-value" style="font-size:16px">${dp(e.best_pathway)}</div>
      <div class="card-sub">Recommended route</div>
    </div>
    <div class="card">
      <div class="card-label">Approval Probability</div>
      <div class="card-value">${fmtPct(e.approval_probability?.value)}</div>
      <div class="card-sub">Model estimate</div>
    </div>
    <div class="card">
      <div class="card-label">Timeline</div>
      <div class="card-value">${dp(e.timeline_months)}mo</div>
      <div class="card-sub">Estimated approval</div>
    </div>
    <div class="card card-${irrClass}">
      <div class="card-label">IRR Impact</div>
      <div class="card-value">${fmtDec(irr)}%</div>
      <div class="card-sub">vs. by-right baseline</div>
    </div>
  </div>
</div>`
}

function renderClimate(c: ClimateResult): string {
  const haircut = Number(c.climate_haircut_pct?.value ?? 0)
  return `
<div class="section">
  <div class="section-header">
    <div class="section-num">06</div>
    <div class="section-title">Climate Risk Assessment</div>
  </div>
  <div class="cards-4">
    <div class="card">
      <div class="card-label">Flood Risk</div>
      <div class="card-value">${dp(c.flood_risk_score)}/10</div>
    </div>
    <div class="card">
      <div class="card-label">Wildfire Risk</div>
      <div class="card-value">${dp(c.wildfire_risk_score)}/10</div>
    </div>
    <div class="card">
      <div class="card-label">Heat Risk</div>
      <div class="card-value">${dp(c.heat_risk_score)}/10</div>
    </div>
    <div class="card card-${haircut > 10 ? 'red' : 'gold'}">
      <div class="card-label">Climate Haircut</div>
      <div class="card-value">${fmtDec(haircut)}%</div>
      <div class="card-sub">AVM reduction</div>
    </div>
  </div>
</div>`
}

const CSS = `
:root{--bg:#04080f;--surface:#080e1a;--card:#0c1422;--border:#162035;--border2:#1e2d4a;--accent:#00d4ff;--green:#00e5a0;--red:#ff4757;--gold:#f0b429;--text:#e8f0fe;--muted:#5a7090;--mono:'Courier New',monospace;--sans:'Arial',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:0 24px}
.header{background:linear-gradient(135deg,#0a1628,#0f1e3a);border-bottom:1px solid var(--border);padding:40px 0 32px}
.logo{font-family:var(--mono);font-size:13px;color:var(--accent);letter-spacing:3px;text-transform:uppercase;margin-bottom:20px}
.address-title{font-size:28px;font-weight:700;color:#fff;margin-bottom:6px}
.address-sub{font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:20px}
.meta-row{display:flex;gap:32px;flex-wrap:wrap;align-items:center}
.meta-item{display:flex;flex-direction:column;gap:2px}
.meta-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;font-family:var(--mono)}
.meta-value{font-size:14px;color:var(--text);font-weight:600}
.deal-score-badge{width:80px;height:80px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-left:auto;box-shadow:0 0 30px rgba(0,0,0,0.4);flex-shrink:0}
.deal-score-letter{font-family:var(--mono);font-size:32px;font-weight:700;color:#fff;line-height:1}
.deal-score-label{font-size:8px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;margin-top:2px}
.alert{border-left:4px solid var(--red);background:rgba(255,71,87,0.06);border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px;color:#ff9aa5}
.alert strong{color:var(--red)}
.warn{border-left:4px solid var(--gold);background:rgba(240,180,41,0.06);border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px;color:#fde68a}
.section{padding:28px 0;border-bottom:1px solid var(--border)}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.section-num{font-family:var(--mono);font-size:9px;color:var(--accent);background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);padding:3px 8px;border-radius:3px;letter-spacing:1px}
.section-title{font-size:17px;font-weight:700;color:#fff}
.cards-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.cards-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.cards-2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px}
.card-red{border-left:3px solid var(--red)}.card-green{border-left:3px solid var(--green)}
.card-accent{border-left:3px solid var(--accent)}.card-gold{border-left:3px solid var(--gold)}
.card-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;font-family:var(--mono);margin-bottom:6px}
.card-value{font-size:20px;font-weight:700;color:#fff;margin-bottom:2px;font-family:var(--mono)}
.card-sub{font-size:11px;color:var(--muted)}
.data-table{width:100%;border-collapse:collapse;font-size:13px}
.data-table th{background:rgba(0,212,255,0.05);padding:9px 12px;text-align:left;font-family:var(--mono);font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);font-weight:400}
.data-table td{padding:9px 12px;border-bottom:1px solid rgba(22,32,53,0.5);color:var(--text)}
.data-table tr:nth-child(even) td{background:rgba(12,20,34,0.4)}
.mono{font-family:var(--mono);font-size:11px}
.badge{display:inline-block;font-family:var(--mono);font-size:8px;letter-spacing:1px;padding:2px 7px;border-radius:3px;text-transform:uppercase}
.badge-green{background:rgba(0,229,160,0.1);border:1px solid rgba(0,229,160,0.25);color:#6ee7b7}
.badge-red{background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.25);color:#fca5a5}
.badge-yellow{background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.25);color:#fde68a}
.badge-blue{background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);color:#7dd3fc}
.badge-unverified{background:rgba(90,112,144,0.1);border:1px solid rgba(90,112,144,0.2);color:var(--muted)}
.skill-bar{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.skill-tag{font-family:var(--mono);font-size:8px;padding:3px 8px;border-radius:3px;letter-spacing:1px;text-transform:uppercase}
.skill-active{background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);color:#a5b4fc}
.strategy-list{display:flex;flex-direction:column;gap:10px}
.strategy-item{display:flex;gap:14px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px}
.strategy-rank{font-family:var(--mono);font-size:22px;font-weight:700;color:var(--accent);flex-shrink:0;line-height:1}
.strategy-name{font-weight:600;color:#fff;margin-bottom:4px;font-size:14px}
.strategy-desc{font-size:12px;color:var(--muted)}
.footer{background:var(--surface);border-top:1px solid var(--border);padding:24px 0;margin-top:32px}
.disclaimer{font-size:10px;color:var(--muted);text-align:center;line-height:1.6;max-width:800px;margin:0 auto}
@media(max-width:768px){.cards-4,.cards-3{grid-template-columns:repeat(2,1fr)}.cards-2{grid-template-columns:1fr}.deal-score-badge{width:60px;height:60px}.deal-score-letter{font-size:24px}}
`

export function renderReportHTML(report: PropertyReport): string {
  const activatedCount = report.skills_activated.filter(s => s.activated).length
  const apnLine = report.address.apn ? `APN: ${report.address.apn} · ` : ''
  const dateStr = new Date(report.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SevenNova.ai — ${report.address.full_address}</title>
<style>${CSS}</style>
</head>
<body>

<div class="header">
  <div class="container">
    <div class="logo">SevenNova.ai // Investment Intelligence Report</div>
    <h1 class="address-title">${report.address.full_address}</h1>
    <div class="address-sub">${apnLine}Report ID: ${report.request_id} · Generated: ${dateStr} · Tier: ${report.tier.toUpperCase()}</div>
    <div class="meta-row">
      <div class="meta-item">
        <div class="meta-label">Deal Score</div>
        <div class="meta-value">${report.deal_score}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Overall Confidence</div>
        <div class="meta-value">${Math.round(report.overall_confidence)}%</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Data Freshness</div>
        <div class="meta-value">${report.data_freshness_summary}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Skills Activated</div>
        <div class="meta-value">${activatedCount}/${report.skills_activated.length}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Generation Time</div>
        <div class="meta-value">${report.generation_time_seconds.toFixed(1)}s</div>
      </div>
      <div class="deal-score-badge" style="background:${scoreColor(report.deal_score)}">
        <div class="deal-score-letter">${report.deal_score}</div>
        <div class="deal-score-label">Score</div>
      </div>
    </div>
  </div>
</div>

<div class="container">

${report.red_flags.map(f => `<div class="alert"><strong>⚠ FLAG:</strong> ${f}</div>`).join('\n')}

<div class="section" style="padding:16px 0;border-bottom:none">
  <div class="skill-bar">
    ${report.skills_activated.map(s => `<span class="skill-tag ${s.activated ? 'skill-active' : 'badge-red'}">${s.skill_name}${s.activated ? '' : ' ✗'}</span>`).join('\n    ')}
  </div>
</div>

<div class="section">
  <div class="section-header">
    <div class="section-num">01</div>
    <div class="section-title">Executive Summary</div>
  </div>
  <p style="font-size:14px;color:var(--text);line-height:1.7;margin-bottom:12px">${report.executive_summary}</p>
  ${report.investment_thesis ? `<p style="font-size:13px;color:var(--muted);line-height:1.7;font-style:italic">${report.investment_thesis}</p>` : ''}
</div>

${report.zoning ? renderZoning(report.zoning) : ''}
${report.valuation ? renderValuation(report.valuation) : ''}
${report.distress ? renderDistress(report.distress) : ''}
${report.entitlement ? renderEntitlement(report.entitlement) : ''}
${report.climate ? renderClimate(report.climate) : ''}

<div class="section">
  <div class="section-header">
    <div class="section-num">07</div>
    <div class="section-title">Strategic Recommendations</div>
  </div>
  <div class="strategy-list">
    ${report.strategic_recommendations.map((rec, i) => `
    <div class="strategy-item">
      <div class="strategy-rank">${i + 1}</div>
      <div>
        <div class="strategy-name">Priority Action #${i + 1}</div>
        <div class="strategy-desc">${rec}</div>
      </div>
    </div>`).join('\n')}
  </div>
</div>

<div class="section">
  <div class="section-header">
    <div class="section-num">08</div>
    <div class="section-title">Risk Summary</div>
  </div>
  <p style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px">${report.risk_summary}</p>
</div>

${report.assumptions.length || report.unverified_items.length ? `
<div class="section">
  <div class="section-header">
    <div class="section-num">09</div>
    <div class="section-title">Assumptions &amp; Unverified Data</div>
  </div>
  ${report.assumptions.length ? `<div class="warn" style="margin-bottom:12px"><strong>Assumptions [ASSUMPTION]:</strong><br>${report.assumptions.map(a => `<div style="margin-top:4px">• ${a}</div>`).join('')}</div>` : ''}
  ${report.unverified_items.length ? `<div class="alert"><strong>Unverified [UNVERIFIED] — verify before relying:</strong><br>${report.unverified_items.map(u => `<div style="margin-top:4px">• ${u}</div>`).join('')}</div>` : ''}
</div>` : ''}

<div class="section">
  <div class="section-header">
    <div class="section-num">10</div>
    <div class="section-title">Skill Activation Log</div>
  </div>
  <table class="data-table">
    <thead><tr><th>Skill</th><th>Status</th><th>Confidence</th><th>Freshness</th><th>Duration</th></tr></thead>
    <tbody>
      ${report.skills_activated.map(s => `
      <tr>
        <td class="mono">${s.skill_name}</td>
        <td><span class="badge badge-${s.activated ? 'green' : 'red'}">${s.activated ? 'Active' : 'Failed'}</span></td>
        <td class="mono">${Math.round(s.confidence)}%</td>
        <td><span class="badge badge-unverified">${s.data_freshness}</span></td>
        <td class="mono">${s.duration_ms ?? '—'}ms</td>
      </tr>`).join('\n')}
    </tbody>
  </table>
</div>

</div>

<div class="footer">
  <div class="disclaimer">
    <strong>DISCLAIMER</strong><br>
    ${report.disclaimer}<br><br>
    <span style="opacity:0.6">Report ID: ${report.request_id} · Generated: ${report.generated_at} · Skills: ${activatedCount}/${report.skills_activated.length} · Confidence: ${Math.round(report.overall_confidence)}% · Data: ${report.data_freshness_summary}</span>
  </div>
</div>

</body>
</html>`
}

export function renderErrorHTML(address: string, error: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>SevenNova.ai — Report Error</title>
<style>body{background:#04080f;color:#e8f0fe;font-family:Arial;padding:40px}
.error{background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.3);border-left:4px solid #ff4757;border-radius:8px;padding:24px;max-width:600px;margin:40px auto}</style>
</head>
<body>
<div class="error">
<h2 style="color:#ff4757;margin-bottom:12px">⚠ Report Generation Failed</h2>
<p><strong>Address:</strong> ${address}</p>
<p style="margin-top:8px;color:#94a3b8;font-size:13px">${error}</p>
<p style="margin-top:16px;font-size:12px;color:#5a7090">For informational purposes only. Not a licensed appraisal. © 2026 SevenNova.ai</p>
</div>
</body>
</html>`
}
