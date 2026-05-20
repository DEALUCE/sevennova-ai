/**
 * PHASE 2 — SevenNova RiskCore Evidence Pack
 * Lender-grade PDF using pdf-lib (pure JS, Cloudflare Workers compatible)
 *
 * PHASE 0 RULE: Only VERIFIED fields appear in the main data tables.
 * INFERRED fields are quarantined to a separate "AI Estimates" section clearly
 * labeled as unverified. UNAVAILABLE fields are shown with status badge only.
 * No fake confidence scores. No "institutional-grade" language without evidence.
 *
 * Styling reference: CoStar / ATTOM appraisal report hierarchy
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import type { PropertyReport, DataPoint } from './orchestrator'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C_NAVY   = rgb(0.04, 0.09, 0.18)
const C_DARK   = rgb(0.12, 0.14, 0.18)
const C_MED    = rgb(0.30, 0.33, 0.38)
const C_GRAY   = rgb(0.52, 0.54, 0.58)
const C_LGRAY  = rgb(0.88, 0.89, 0.91)
const C_CYAN   = rgb(0.00, 0.55, 0.75)
const C_GREEN  = rgb(0.08, 0.55, 0.30)
const C_RED    = rgb(0.76, 0.12, 0.12)
const C_AMBER  = rgb(0.75, 0.44, 0.02)
const C_WHITE  = rgb(1.00, 1.00, 1.00)
const C_BG     = rgb(0.96, 0.97, 0.98)
const C_BG2    = rgb(0.92, 0.94, 0.97)

function statusColor(status?: string) {
  switch (status) {
    case 'VERIFIED':           return C_GREEN
    case 'UNAVAILABLE':        return C_RED
    case 'NEEDS_HUMAN_REVIEW': return C_AMBER
    case 'INFERRED':           return C_AMBER
    default:                   return C_GRAY
  }
}

function statusBadgeText(status?: string): string {
  switch (status) {
    case 'VERIFIED':           return 'VERIFIED'
    case 'UNAVAILABLE':        return 'UNAVAILABLE'
    case 'NEEDS_HUMAN_REVIEW': return 'NEEDS REVIEW'
    case 'INFERRED':           return 'AI ESTIMATE'
    default:                   return 'UNVERIFIED'
  }
}

// ── PHASE 0 SUPPRESSION ───────────────────────────────────────────────────────
// Returns true if field should appear in the VERIFIED main table.
// INFERRED fields are quarantined to AI Estimates section.
function isVerifiedOrUnavailable(dp: DataPoint | undefined): boolean {
  if (!dp) return false
  const s = (dp as unknown as Record<string, unknown>).status as string | undefined
  return s === 'VERIFIED' || s === 'UNAVAILABLE'
}

function isInferred(dp: DataPoint | undefined): boolean {
  if (!dp) return false
  const s = (dp as unknown as Record<string, unknown>).status as string | undefined
  return !s || s === 'INFERRED' || s === 'UNVERIFIED'
}

// ── TEXT UTILITIES ─────────────────────────────────────────────────────────────
function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = String(text ?? '').split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function safeStr(v: unknown, max = 80): string {
  if (v == null) return '-'
  return String(v).slice(0, max)
}

// ── WRITER CLASS ──────────────────────────────────────────────────────────────
class Writer {
  doc: PDFDocument
  page!: PDFPage
  y = 0
  reg: PDFFont
  bold: PDFFont
  mono: PDFFont
  pageNum = 0

  constructor(doc: PDFDocument, reg: PDFFont, bold: PDFFont, mono: PDFFont) {
    this.doc = doc; this.reg = reg; this.bold = bold; this.mono = mono
    this.newPage()
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.y = PAGE_H - MARGIN
    this.pageNum++
  }

  ensure(needed: number) {
    if (this.y - needed < MARGIN + 30) this.newPage()
  }

  text(str: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; maxW?: number } = {}) {
    const { size = 10, font = this.reg, color = C_DARK, indent = 0, maxW = CONTENT_W - indent } = opts
    const lines = wrapText(str, font, size, maxW)
    const lineH = size * 1.55
    this.ensure(lines.length * lineH + 4)
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font, color })
      this.y -= lineH
    }
  }

  // Section heading with colored left bar
  heading(str: string) {
    this.ensure(28)
    this.y -= 8
    this.page.drawRectangle({ x: MARGIN, y: this.y - 2, width: 3, height: 18, color: C_CYAN })
    this.page.drawText(str.toUpperCase(), { x: MARGIN + 10, y: this.y, size: 10, font: this.bold, color: C_NAVY })
    this.y -= 14
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + CONTENT_W, y: this.y }, thickness: 0.5, color: C_LGRAY })
    this.y -= 8
  }

  subheading(str: string) {
    this.ensure(20)
    this.y -= 4
    this.page.drawText(str, { x: MARGIN, y: this.y, size: 9.5, font: this.bold, color: C_DARK })
    this.y -= 15
  }

  gap(n = 8) { this.y -= n }

  hline(color = C_LGRAY) {
    this.ensure(6)
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + CONTENT_W, y: this.y }, thickness: 0.4, color })
    this.y -= 6
  }

  // Column headers for data tables
  tableHeader(cols: string[], xs: number[]) {
    this.ensure(18)
    this.page.drawRectangle({ x: MARGIN, y: this.y - 3, width: CONTENT_W, height: 15, color: C_BG2 })
    for (let i = 0; i < cols.length; i++) {
      this.page.drawText(cols[i], { x: MARGIN + xs[i], y: this.y, size: 7.5, font: this.bold, color: C_MED })
    }
    this.y -= 16
  }

  // Data row: field | value | status badge | confidence | source
  dataRow(label: string, dp: DataPoint | null | undefined) {
    if (!dp) return
    const dpAny = dp as unknown as Record<string, unknown>
    const val    = dp.value == null ? '-' : String(dp.value).slice(0, 50)
    const status = dpAny.status as string | undefined ?? 'INFERRED'
    const source = dpAny.source as string | undefined ?? ''
    const conf   = dp.confidence ?? 0
    const col    = statusColor(status)
    const badge  = statusBadgeText(status)

    this.ensure(16)

    // Alternating row bg
    if (this.pageNum % 2 === 0) {
      this.page.drawRectangle({ x: MARGIN, y: this.y - 3, width: CONTENT_W, height: 14, color: rgb(0.975, 0.977, 0.980), opacity: 0.5 })
    }

    this.page.drawText(label.slice(0, 28), { x: MARGIN + 2, y: this.y, size: 8.5, font: this.bold, color: C_DARK })
    this.page.drawText(val, { x: MARGIN + 158, y: this.y, size: 8.5, font: this.reg, color: C_DARK })

    // Status badge
    const bw = 70
    this.page.drawRectangle({ x: MARGIN + 336, y: this.y - 2, width: bw, height: 11, color: col, opacity: 0.12 })
    this.page.drawRectangle({ x: MARGIN + 336, y: this.y - 2, width: bw, height: 11, borderColor: col, borderWidth: 0.5, opacity: 0 })
    this.page.drawText(badge, { x: MARGIN + 338, y: this.y, size: 7, font: this.bold, color: col })

    // Confidence
    this.page.drawText(`${conf}%`, { x: MARGIN + 414, y: this.y, size: 7.5, font: this.mono, color: C_GRAY })

    // Source (truncated)
    this.page.drawText(source.slice(0, 30), { x: MARGIN + 440, y: this.y, size: 6.5, font: this.mono, color: C_GRAY })

    this.y -= 15
  }

  flagRow(flag: string, severity: 'HIGH' | 'MEDIUM' | 'INFO' = 'HIGH') {
    const col = severity === 'HIGH' ? C_RED : severity === 'MEDIUM' ? C_AMBER : C_GRAY
    this.ensure(18)
    this.page.drawRectangle({ x: MARGIN, y: this.y - 3, width: 3, height: 13, color: col })
    this.text(flag, { indent: 8, size: 8.5, color: C_DARK, maxW: CONTENT_W - 8 })
  }

  bullet(str: string, indent = 10) {
    this.ensure(15)
    this.page.drawText('-', { x: MARGIN + indent - 8, y: this.y, size: 9, font: this.reg, color: C_CYAN })
    this.text(str, { indent, size: 9, color: C_DARK, maxW: CONTENT_W - indent })
  }

  // Key-value pair for cover / summary info
  kv(label: string, value: string, valueColor = C_DARK) {
    this.ensure(16)
    this.page.drawText(label + ':', { x: MARGIN, y: this.y, size: 9, font: this.bold, color: C_GRAY })
    this.page.drawText(safeStr(value, 90), { x: MARGIN + 130, y: this.y, size: 9, font: this.reg, color: valueColor })
    this.y -= 15
  }
}

// ── STREET VIEW FETCH (Phase 2 — optional, requires GOOGLE_MAPS_API_KEY) ──────
async function fetchStreetView(address: string, apiKey: string): Promise<Uint8Array | null> {
  // BLOCKER: Requires GOOGLE_MAPS_API_KEY secret. Set via: wrangler secret put GOOGLE_MAPS_API_KEY
  // Free tier: 28,000 requests/month. Falls back gracefully if not set.
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview?size=500x220&location=${encodeURIComponent(address)}&fov=80&pitch=0&key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('image')) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function generatePDFReport(
  report: PropertyReport,
  userKey?: string,
  googleMapsApiKey?: string,
): Promise<Uint8Array> {
  const doc  = await PDFDocument.create()
  const reg  = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)
  const w = new Writer(doc, reg, bold, mono)

  // Try Street View image
  let streetViewImg = null
  if (googleMapsApiKey) {
    const bytes = await fetchStreetView(report.address.full_address, googleMapsApiKey).catch(() => null)
    if (bytes) {
      try { streetViewImg = await doc.embedJpg(bytes) } catch { streetViewImg = null }
    }
  }

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  // Navy header band
  w.page.drawRectangle({ x: 0, y: PAGE_H - 110, width: PAGE_W, height: 110, color: C_NAVY })
  w.page.drawText('SevenNova', { x: MARGIN, y: PAGE_H - 42, size: 20, font: bold, color: C_CYAN })
  w.page.drawText('RiskCore', { x: MARGIN + 118, y: PAGE_H - 42, size: 20, font: bold, color: C_WHITE })
  w.page.drawText('Verified Los Angeles Property Risk & Zoning Evidence Pack', {
    x: MARGIN, y: PAGE_H - 62, size: 10, font: reg, color: rgb(0.75, 0.78, 0.82),
  })
  w.page.drawText('FOR LENDERS, DEVELOPERS, AND ACQUISITION TEAMS — NOT A LICENSED APPRAISAL', {
    x: MARGIN, y: PAGE_H - 78, size: 7.5, font: bold, color: rgb(0.55, 0.58, 0.62),
  })
  // Cyan accent line
  w.page.drawRectangle({ x: 0, y: PAGE_H - 115, width: PAGE_W, height: 5, color: C_CYAN })

  w.y = PAGE_H - 135

  // Street View or placeholder
  if (streetViewImg) {
    w.page.drawImage(streetViewImg, { x: MARGIN, y: w.y - 120, width: 260, height: 115 })
    // Property info beside image
    const ix = MARGIN + 275
    w.page.drawText('SUBJECT PROPERTY', { x: ix, y: w.y, size: 7.5, font: bold, color: C_GRAY })
    w.page.drawText(report.address.street, { x: ix, y: w.y - 14, size: 11, font: bold, color: C_DARK })
    w.page.drawText(`${report.address.city}, ${report.address.state}${report.address.zip_code ? ' ' + report.address.zip_code : ''}`, { x: ix, y: w.y - 26, size: 9, font: reg, color: C_MED })
    if (report.address.apn) w.page.drawText(`APN: ${report.address.apn}`, { x: ix, y: w.y - 38, size: 8.5, font: mono, color: C_MED })
    w.y -= 130
  } else {
    // No Street View — show address prominently
    w.gap(12)
    w.page.drawText('SUBJECT PROPERTY', { x: MARGIN, y: w.y, size: 7.5, font: bold, color: C_GRAY })
    w.y -= 14
    w.page.drawText(report.address.street, { x: MARGIN, y: w.y, size: 16, font: bold, color: C_DARK })
    w.y -= 20
    w.page.drawText(`${report.address.city}, ${report.address.state}${report.address.zip_code ? ' ' + report.address.zip_code : ''}`, {
      x: MARGIN, y: w.y, size: 11, font: reg, color: C_MED,
    })
    w.y -= 15
    if (report.address.apn) {
      w.page.drawText(`APN: ${report.address.apn}`, { x: MARGIN, y: w.y, size: 9, font: mono, color: C_MED })
      w.y -= 14
    }
    // BLOCKER note for Street View
    w.page.drawText('[ Property photo: set GOOGLE_MAPS_API_KEY secret to enable ]', {
      x: MARGIN, y: w.y, size: 7.5, font: reg, color: C_GRAY,
    })
    w.y -= 18
  }

  w.gap(14)
  w.hline()

  // Report metadata grid
  const dealCol = report.deal_score === 'A' ? C_GREEN : report.deal_score === 'B' ? C_CYAN : report.deal_score >= 'D' ? C_RED : C_AMBER
  w.kv('Report Tier',     report.tier.toUpperCase())
  w.kv('Deal Score',      `${report.deal_score}  —  ${report.deal_score_rationale}`, dealCol)
  w.kv('Data Confidence', `${report.overall_confidence}%  ${report.overall_confidence < 50 ? '(LOW — see Human Review flags)' : ''}`,
    report.overall_confidence < 50 ? C_RED : C_GREEN)
  w.kv('Data Status',     report.data_freshness_summary)
  w.kv('Generated',       report.generated_at)
  w.kv('Audit ID',        report.request_id)
  if (userKey) w.kv('API Key', `${userKey.slice(0, 16)}...`)

  w.gap(14)

  // Cover disclaimer box
  w.page.drawRectangle({ x: MARGIN, y: w.y - 52, width: CONTENT_W, height: 60, color: C_BG2 })
  w.page.drawRectangle({ x: MARGIN, y: w.y - 52, width: 3, height: 60, color: C_AMBER })
  w.y -= 6
  w.text('DATA PROVENANCE STATEMENT', { size: 8, font: bold, color: C_AMBER, indent: 8 })
  w.text(
    'Fields marked VERIFIED are sourced from live public-record APIs (ZIMAS, LADBS, FEMA, USGS, CalFire, Census, HUD). ' +
    'Fields marked AI ESTIMATE are model-generated and have NOT been verified against a primary source. ' +
    'AI estimates are shown in a separate section and must not be used as sole basis for lending or investment decisions. ' +
    'This report is not a licensed appraisal and is not legal advice.',
    { size: 7.5, color: C_DARK, indent: 8, maxW: CONTENT_W - 16 },
  )

  // ── PAGE 2 — VERIFIED DATA SUMMARY ────────────────────────────────────────
  w.newPage()
  w.heading('Verified Data Summary — Public Record Sources Only')
  w.text(
    'All fields in this section are sourced from verified public-record APIs. ' +
    'UNAVAILABLE means the source query failed or returned no data for this address — not that the condition does not exist.',
    { size: 8.5, color: C_MED },
  )
  w.gap(8)

  function emitVerifiedSection(sectionTitle: string, obj: Record<string, unknown> | undefined) {
    if (!obj) return
    const rows = Object.entries(obj).filter(([k, v]) => {
      if (k === 'confidence_overall') return false
      if (!v || typeof v !== 'object' || !('value' in v)) return false
      return isVerifiedOrUnavailable(v as DataPoint)
    })
    if (!rows.length) return
    w.subheading(sectionTitle)
    w.tableHeader(['FIELD', 'VALUE', 'STATUS', 'CONF', 'SOURCE'], [2, 158, 336, 414, 440])
    for (const [k, v] of rows) {
      w.dataRow(k.replace(/_/g, ' '), v as DataPoint)
    }
    w.gap(6)
  }

  emitVerifiedSection('Zoning (LA City ZIMAS)', report.zoning as unknown as Record<string, unknown>)
  emitVerifiedSection('Climate & Hazard Risk', report.climate as unknown as Record<string, unknown>)
  emitVerifiedSection('Distress Indicators', report.distress as unknown as Record<string, unknown>)
  emitVerifiedSection('Entitlement', report.entitlement as unknown as Record<string, unknown>)
  emitVerifiedSection('Valuation Inputs', report.valuation as unknown as Record<string, unknown>)

  // ── ZONING DETAIL ─────────────────────────────────────────────────────────
  if (report.zoning) {
    w.heading('Zoning & Entitlement Detail')
    const z = report.zoning
    const rows: [string, DataPoint | undefined][] = [
      ['Zoning Code',         z.zoning_code],
      ['Max FAR',             z.max_far],
      ['Height Limit (ft)',   z.height_limit_ft],
      ['TOC Tier',            z.toc_tier],
      ['Buildable SF',        z.buildable_sf],
      ['Max Units (by-right)',z.max_units_by_right],
      ['Max Units (TOC)',     z.max_units_toc],
      ['LADBS Violations',    z.ladbs_violations],
      ['RSO Covered',         z.rso_covered],
      ['Permitted Uses',      z.permitted_uses],
    ]
    w.tableHeader(['FIELD', 'VALUE', 'STATUS', 'CONF', 'SOURCE'], [2, 158, 336, 414, 440])
    for (const [label, dp] of rows) w.dataRow(label, dp)
    w.gap(6)
    w.text(`Overall Zoning Confidence: ${z.confidence_overall}%`, { size: 8, color: C_GRAY })
    w.gap(8)
  }

  // ── LADBS PERMITS & VIOLATIONS ────────────────────────────────────────────
  w.heading('LADBS Permits & Code Violations')
  w.text('Source: City of Los Angeles Department of Building & Safety (data.lacity.org). Public records.', { size: 8, color: C_GRAY })
  w.gap(6)
  if (report.zoning?.ladbs_violations) {
    w.tableHeader(['FIELD', 'VALUE', 'STATUS', 'CONF', 'SOURCE'], [2, 158, 336, 414, 440])
    w.dataRow('Active Violations', report.zoning.ladbs_violations)
    if (report.distress?.ladbs_order_active) w.dataRow('LADBS Order Active', report.distress.ladbs_order_active)
  } else {
    w.text('LADBS data: UNAVAILABLE — verify directly at data.lacity.org', { size: 8.5, color: C_AMBER })
  }
  w.gap(10)

  // ── HAZARD & CLIMATE ──────────────────────────────────────────────────────
  if (report.climate) {
    w.heading('Hazard & Climate Risk')
    const c = report.climate
    const rows: [string, DataPoint | undefined][] = [
      ['Flood Zone (FEMA)',   c.flood_risk_score],
      ['Fire Hazard Zone',    c.wildfire_risk_score],
      ['Seismic Risk (USGS)', c.seismic_risk_score],
      ['Heat Risk',           c.heat_risk_score],
      ['Insurance Stress',    c.insurance_stress_score],
      ['Climate Haircut %',   c.climate_haircut_pct],
    ]
    w.tableHeader(['FIELD', 'VALUE', 'STATUS', 'CONF', 'SOURCE'], [2, 158, 336, 414, 440])
    for (const [label, dp] of rows) w.dataRow(label, dp)
    w.gap(8)
  }

  // ── ENTITLEMENT SCREENING ─────────────────────────────────────────────────
  if (report.entitlement) {
    w.heading('Entitlement Screening')
    const e = report.entitlement
    const rows: [string, DataPoint | undefined][] = [
      ['Best Pathway',         e.best_pathway],
      ['Approval Probability', e.approval_probability],
      ['Timeline (months)',    e.timeline_months],
      ['Jurisdiction Risk',    e.jurisdiction_risk],
    ]
    w.tableHeader(['FIELD', 'VALUE', 'STATUS', 'CONF', 'SOURCE'], [2, 158, 336, 414, 440])
    for (const [label, dp] of rows) w.dataRow(label, dp)
    w.gap(4)
    // Suppress IRR and carry cost unless VERIFIED
    if (!isInferred(e.irr_impact_pct) && !isInferred(e.carry_cost_monthly)) {
      w.dataRow('IRR Impact %', e.irr_impact_pct)
      w.dataRow('Carry Cost/Month', e.carry_cost_monthly)
    } else {
      w.text('IRR impact and carry cost: suppressed — not verified against primary source. (Phase 0 rule)', { size: 7.5, color: C_GRAY })
    }
    w.gap(8)
  }

  // ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────
  w.heading('Executive Summary')
  w.text(report.executive_summary || '[No summary generated]', { size: 9.5 })
  w.gap(8)
  if (report.investment_thesis) {
    w.subheading('Investment Thesis')
    w.text(report.investment_thesis, { size: 9.5 })
    w.gap(6)
  }
  if (report.risk_summary) {
    w.subheading('Risk Summary')
    w.text(report.risk_summary, { size: 9.5 })
    w.gap(6)
  }
  if (report.strategic_recommendations?.length) {
    w.subheading('Strategic Recommendations')
    for (const rec of report.strategic_recommendations) w.bullet(rec)
    w.gap(6)
  }

  // ── HUMAN REVIEW FLAGS ────────────────────────────────────────────────────
  w.heading('Human Review Required')
  w.text(
    'The following items could not be verified from public-record sources and require manual verification before any lending or acquisition decision.',
    { size: 8.5, color: C_MED },
  )
  w.gap(6)

  const humanReviewItems: string[] = []
  // Add flags from report
  for (const flag of report.red_flags ?? []) humanReviewItems.push(flag)
  // Add UNAVAILABLE fields
  const allSections = [
    ['Zoning', report.zoning],
    ['Climate', report.climate],
    ['Distress', report.distress],
    ['Entitlement', report.entitlement],
    ['Valuation', report.valuation],
  ] as const
  for (const [sec, obj] of allSections) {
    if (!obj) continue
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'confidence_overall') continue
      if (!v || typeof v !== 'object' || !('value' in v)) continue
      const dp = v as DataPoint
      const dpAny = dp as unknown as Record<string, unknown>
      if (dpAny.status === 'UNAVAILABLE') {
        humanReviewItems.push(`${sec}: ${k.replace(/_/g, ' ')} — source query failed, verify directly`)
      }
    }
  }

  if (!humanReviewItems.length) {
    w.text('No critical human review flags.', { size: 9, color: C_GREEN })
  } else {
    for (const item of humanReviewItems) {
      const sev = item.includes('CRITICAL') ? 'HIGH' : item.includes('LOW CONFIDENCE') ? 'MEDIUM' : 'INFO'
      w.flagRow(item, sev)
    }
  }
  w.gap(8)

  // ── AI ESTIMATES (Phase 0 quarantine) ────────────────────────────────────
  const hasInferred = (() => {
    for (const [, obj] of allSections) {
      if (!obj) continue
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'confidence_overall') continue
        if (v && typeof v === 'object' && 'value' in v && isInferred(v as DataPoint)) return true
      }
    }
    return false
  })()

  if (hasInferred) {
    w.heading('AI Estimates — Requires Verification Before Use')
    w.page.drawRectangle({ x: MARGIN, y: w.y - 6, width: CONTENT_W, height: 22, color: rgb(0.80, 0.44, 0.02), opacity: 0.08 })
    w.y -= 4
    w.text(
      'WARNING: The following fields are AI-generated estimates with NO verified primary source. ' +
      'They must NOT be used as sole basis for any lending, valuation, or investment decision. ' +
      'Obtain independent verification before relying on these values.',
      { size: 8, color: C_AMBER, maxW: CONTENT_W - 4 },
    )
    w.gap(10)

    for (const [sectionTitle, obj] of allSections) {
      if (!obj) continue
      const rows = Object.entries(obj).filter(([k, v]) => {
        if (k === 'confidence_overall') return false
        return v && typeof v === 'object' && 'value' in v && isInferred(v as DataPoint)
      })
      if (!rows.length) continue
      w.subheading(`${sectionTitle} — AI Estimates`)
      w.tableHeader(['FIELD', 'VALUE', 'STATUS', 'CONF', 'SOURCE'], [2, 158, 336, 414, 440])
      for (const [k, v] of rows) w.dataRow(k.replace(/_/g, ' '), v as DataPoint)
      w.gap(6)
    }
  }

  // ── SOURCE APPENDIX ───────────────────────────────────────────────────────
  w.heading('Source Appendix — All Data Sources')
  w.text('All public-record sources queried for this report, with retrieval timestamps.', { size: 8.5, color: C_GRAY })
  w.gap(6)

  const sources: [string, string, string][] = [
    ['LA City ZIMAS',            'maps.lacity.org/lahub',                    'Zoning code, FAR, height district — live spatial query'],
    ['LA County Assessor',       'assessor.lacounty.gov',                    'Lot size, year built, last sale price and date'],
    ['LADBS Permits',            'data.lacity.org/resource/hbkd-qubn',       'Building permit history'],
    ['LADBS Violations',         'data.lacity.org/resource/u82d-eh7z',       'Code enforcement open violations'],
    ['FEMA NFHL',                'hazards.fema.gov',                         'Flood zone designation (National Flood Hazard Layer)'],
    ['CalFire FHSZ',             'services1.arcgis.com (CalFire)',            'Fire Hazard Severity Zone (2023 update)'],
    ['US Census / ACS5',         'api.censusreporter.org',                   'Median income, severe rent burden (B19013, B25070)'],
    ['HUD Opportunity Zones',    'services.arcgis.com (HUD)',                'Opportunity Zone designation'],
    ['LA City TOC Tiers',        'services1.arcgis.com (LA City Planning)',   'Transit Oriented Communities incentive area tiers 1-4'],
    ['USGS Seismic / ASCE 7-22', 'earthquake.usgs.gov/ws/designmaps',        'Spectral acceleration (Ss, S1, PGA) for seismic risk'],
  ]

  w.tableHeader(['SOURCE', 'ENDPOINT', 'DATA RETURNED'], [2, 140, 295])
  for (const [name, url, desc] of sources) {
    w.ensure(20)
    w.page.drawText(name, { x: MARGIN + 2, y: w.y, size: 8, font: bold, color: C_DARK })
    w.page.drawText(url.slice(0, 38), { x: MARGIN + 140, y: w.y, size: 7.5, font: mono, color: C_CYAN })
    w.page.drawText(desc.slice(0, 55), { x: MARGIN + 295, y: w.y, size: 7.5, font: reg, color: C_MED })
    w.y -= 14
  }
  w.gap(8)

  // Skills log
  w.subheading('Skills Executed')
  for (const skill of report.skills_activated ?? []) {
    const icon = skill.activated ? '[OK]' : '[FAIL]'
    const col  = skill.activated ? C_GREEN : C_RED
    w.ensure(13)
    w.page.drawText(icon, { x: MARGIN, y: w.y, size: 7.5, font: bold, color: col })
    w.page.drawText(
      `${skill.skill_name}  conf:${skill.confidence}%  ${skill.data_freshness}` +
      (skill.error ? `  ERR: ${skill.error.slice(0, 50)}` : ''),
      { x: MARGIN + 34, y: w.y, size: 7.5, font: mono, color: C_MED },
    )
    w.y -= 12
  }

  // ── FOOTER ON EVERY PAGE ──────────────────────────────────────────────────
  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]
    pg.drawLine({ start: { x: MARGIN, y: 38 }, end: { x: PAGE_W - MARGIN, y: 38 }, thickness: 0.4, color: C_LGRAY })
    pg.drawText('SevenNova RiskCore  |  Verified Public-Record Evidence Pack  |  NOT A LICENSED APPRAISAL', {
      x: MARGIN, y: 26, size: 6.5, font: reg, color: C_GRAY,
    })
    pg.drawText(`Audit ID: ${report.request_id}  |  ${report.generated_at}  |  Page ${i + 1} of ${pages.length}`, {
      x: MARGIN, y: 16, size: 6.5, font: mono, color: C_GRAY,
    })
  }

  // Final disclaimer page
  w.newPage()
  w.heading('Disclaimer & Legal Notice')
  w.gap(6)
  const disclaimerParas = [
    report.disclaimer,
    'VERIFIED fields are sourced from live public-record government APIs at the time of generation. SevenNova does not guarantee the accuracy or completeness of third-party data sources.',
    'AI ESTIMATE fields are generated by large language models and are not sourced from any primary data provider. These fields must be independently verified before any transaction.',
    'This report does not constitute a licensed real estate appraisal, broker price opinion, legal opinion, credit decision, or investment recommendation.',
    'ATTORNEY REVIEW REQUIRED: All legal determinations including zoning compliance, entitlement feasibility, and code violation liability require review by a licensed California real estate attorney.',
    'MLS COMPS SUPPRESSED: No comparable sales data is included in this report. Valuation conclusions require a licensed MLS data feed and a licensed appraiser or broker.',
  ]
  for (const para of disclaimerParas) {
    w.text(para, { size: 9 })
    w.gap(8)
  }

  return doc.save()
}
