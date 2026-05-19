/**
 * PHASE 0 — Lender-grade PDF report generator
 * Uses pdf-lib (pure JS, Cloudflare Workers compatible — no Node.js streams)
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import type { PropertyReport, DataPoint } from './orchestrator'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2

// Colors
const C_BLACK  = rgb(0.08, 0.08, 0.08)
const C_DARK   = rgb(0.15, 0.15, 0.15)
const C_GRAY   = rgb(0.45, 0.45, 0.45)
const C_CYAN   = rgb(0.00, 0.65, 0.82)
const C_GREEN  = rgb(0.10, 0.62, 0.35)
const C_RED    = rgb(0.80, 0.15, 0.15)
const C_AMBER  = rgb(0.80, 0.50, 0.05)
const C_WHITE  = rgb(1.00, 1.00, 1.00)
const C_BG     = rgb(0.96, 0.97, 0.98)

function statusColor(status?: string) {
  switch (status) {
    case 'VERIFIED': return C_GREEN
    case 'UNAVAILABLE': return C_RED
    case 'NEEDS_HUMAN_REVIEW': return C_AMBER
    default: return C_GRAY  // INFERRED or unknown
  }
}

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

class Writer {
  doc: PDFDocument
  page!: PDFPage
  y = 0
  reg: PDFFont
  bold: PDFFont
  mono: PDFFont

  constructor(doc: PDFDocument, reg: PDFFont, bold: PDFFont, mono: PDFFont) {
    this.doc = doc
    this.reg = reg
    this.bold = bold
    this.mono = mono
    this.newPage()
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.y = PAGE_H - MARGIN
  }

  ensure(needed: number) {
    if (this.y - needed < MARGIN + 20) this.newPage()
  }

  text(
    str: string,
    opts: {
      size?: number
      font?: PDFFont
      color?: ReturnType<typeof rgb>
      indent?: number
      maxW?: number
    } = {},
  ) {
    const { size = 10, font = this.reg, color = C_DARK, indent = 0, maxW = CONTENT_W - indent } = opts
    const lines = wrapText(str, font, size, maxW)
    const lineH = size * 1.55
    this.ensure(lines.length * lineH + 4)
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font, color })
      this.y -= lineH
    }
  }

  heading(str: string, size = 14) {
    this.ensure(size * 2 + 12)
    this.y -= 6
    this.text(str, { size, font: this.bold, color: C_CYAN })
    this.hline()
  }

  subheading(str: string) {
    this.ensure(22)
    this.y -= 4
    this.text(str, { size: 11, font: this.bold, color: C_BLACK })
  }

  hline(color = C_BG, thick = 1) {
    this.ensure(6)
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 2 },
      end: { x: MARGIN + CONTENT_W, y: this.y + 2 },
      thickness: thick,
      color,
    })
    this.y -= 6
  }

  gap(n = 8) { this.y -= n }

  /**
   * Data row: label | value | status badge | source
   */
  dataRow(label: string, dp: DataPoint | null | undefined, indent = 0) {
    if (!dp) return
    const val = dp.value == null ? '—' : String(dp.value)
    const dpAny = dp as unknown as Record<string, unknown>
    const status = dpAny.status as string | undefined ?? 'INFERRED'
    const source = dpAny.source as string | undefined ?? ''
    const conf = dp.confidence ?? 0

    this.ensure(18)

    // Label
    this.page.drawText(label.slice(0, 30), {
      x: MARGIN + indent, y: this.y, size: 9, font: this.bold, color: C_DARK,
    })
    // Value
    this.page.drawText(val.slice(0, 45), {
      x: MARGIN + indent + 165, y: this.y, size: 9, font: this.reg, color: C_DARK,
    })
    // Status badge
    const badgeX = MARGIN + indent + 340
    this.page.drawRectangle({
      x: badgeX - 2, y: this.y - 2, width: 88, height: 12,
      color: statusColor(status), opacity: 0.12,
    })
    this.page.drawText(status.slice(0, 16), {
      x: badgeX, y: this.y, size: 7.5, font: this.bold, color: statusColor(status),
    })
    // Confidence
    this.page.drawText(`${conf}%`, {
      x: MARGIN + indent + 436, y: this.y, size: 8, font: this.mono, color: C_GRAY,
    })
    // Source
    this.page.drawText(source.slice(0, 28), {
      x: MARGIN + indent + 460, y: this.y, size: 7, font: this.mono, color: C_GRAY,
    })

    this.y -= 16
  }

  /**
   * Column headers for data rows
   */
  dataHeader() {
    this.ensure(18)
    const cols = ['Field', 'Value', 'Status', 'Conf', 'Source']
    const xs = [0, 165, 340, 436, 460]
    for (let i = 0; i < cols.length; i++) {
      this.page.drawText(cols[i], {
        x: MARGIN + xs[i], y: this.y, size: 8, font: this.bold, color: C_GRAY,
      })
    }
    this.y -= 14
    this.hline(C_BG, 0.5)
  }

  flagRow(flag: string) {
    this.ensure(16)
    this.page.drawText('!', { x: MARGIN, y: this.y, size: 9, font: this.bold, color: C_RED })
    this.text(flag, { indent: 14, size: 9, color: C_DARK, maxW: CONTENT_W - 14 })
  }

  bullet(str: string, indent = 10) {
    this.ensure(16)
    this.page.drawText('-', { x: MARGIN + indent - 10, y: this.y, size: 9, font: this.reg, color: C_CYAN })
    this.text(str, { indent, size: 9, color: C_DARK, maxW: CONTENT_W - indent })
  }
}

export async function generatePDFReport(report: PropertyReport, userKey?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const reg  = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)

  const w = new Writer(doc, reg, bold, mono)

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  // Dark header bar
  w.page.drawRectangle({ x: 0, y: PAGE_H - 130, width: PAGE_W, height: 130, color: rgb(0.04, 0.08, 0.12) })
  w.page.drawText('SevenNova.ai', { x: MARGIN, y: PAGE_H - 50, size: 22, font: bold, color: C_CYAN })
  w.page.drawText('Verified Los Angeles Zoning & Entitlement Intelligence', {
    x: MARGIN, y: PAGE_H - 72, size: 11, font: reg, color: C_WHITE,
  })
  w.page.drawText('LENDER-GRADE PROPERTY REPORT', {
    x: MARGIN, y: PAGE_H - 92, size: 9, font: bold, color: rgb(0.70, 0.72, 0.75),
  })
  w.y = PAGE_H - 155

  w.gap(20)
  w.text(report.address.full_address, { size: 16, font: bold, color: C_BLACK })
  w.gap(6)

  const meta: [string, string][] = [
    ['Report Tier',   report.tier.toUpperCase()],
    ['Deal Score',    `${report.deal_score} — ${report.deal_score_rationale}`],
    ['Confidence',   `${report.overall_confidence}%`],
    ['Generated',    report.generated_at],
    ['Audit ID',     report.request_id],
    ['Data Status',  report.data_freshness_summary],
  ]
  if (userKey) meta.push(['API Key', `${userKey.slice(0, 12)}…`])

  for (const [k, v] of meta) {
    w.ensure(16)
    w.page.drawText(k + ':', { x: MARGIN, y: w.y, size: 10, font: bold, color: C_GRAY })
    w.page.drawText(String(v).slice(0, 80), { x: MARGIN + 120, y: w.y, size: 10, font: reg, color: C_DARK })
    w.y -= 16
  }

  w.gap(16)
  w.hline(rgb(0.82, 0.85, 0.88), 0.5)
  w.gap(10)

  // Disclaimer box on cover
  w.page.drawRectangle({ x: MARGIN, y: w.y - 44, width: CONTENT_W, height: 52, color: C_BG })
  w.y -= 4
  w.text('IMPORTANT NOTICE — DATA PROVENANCE', { size: 8, font: bold, color: C_AMBER, indent: 6 })
  w.text(
    'Verified public-record data (ZIMAS, LADBS, FEMA, CalFire, Census) is labelled VERIFIED. ' +
    'AI-interpreted fields are labelled INFERRED. Missing data is labelled UNAVAILABLE. ' +
    'This report is not a licensed appraisal and is not legal advice.',
    { size: 7.5, color: C_DARK, indent: 6, maxW: CONTENT_W - 12 },
  )
  w.gap(8)

  // ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
  w.newPage()
  w.heading('Executive Summary')
  w.gap(4)
  w.text(report.executive_summary || '[No summary generated]', { size: 10 })
  w.gap(8)

  if (report.investment_thesis) {
    w.subheading('Investment Thesis')
    w.text(report.investment_thesis, { size: 10 })
    w.gap(6)
  }

  if (report.risk_summary) {
    w.subheading('Risk Summary')
    w.text(report.risk_summary, { size: 10 })
    w.gap(6)
  }

  if (report.strategic_recommendations?.length) {
    w.subheading('Strategic Recommendations')
    for (const rec of report.strategic_recommendations) {
      w.bullet(rec)
    }
    w.gap(6)
  }

  // ── VERIFIED DATA TABLE ────────────────────────────────────────────────────
  w.heading('Verified Data — All Fields')
  w.text(
    'Every field below includes its source, retrieval status, and confidence score. ' +
    'VERIFIED = confirmed public-record API. INFERRED = AI interpretation. UNAVAILABLE = source returned no data.',
    { size: 9, color: C_GRAY },
  )
  w.gap(8)
  w.dataHeader()

  // Helper to emit all DataPoint fields from a typed object
  function emitSection(label: string, obj: Record<string, unknown> | undefined) {
    if (!obj) return
    w.subheading(label)
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'confidence_overall') continue
      if (v && typeof v === 'object' && 'value' in v) {
        w.dataRow(k.replace(/_/g, ' '), v as DataPoint)
      }
    }
    w.gap(6)
  }

  emitSection('Zoning', report.zoning as unknown as Record<string, unknown>)
  emitSection('Valuation', report.valuation as unknown as Record<string, unknown>)
  emitSection('Climate Risk', report.climate as unknown as Record<string, unknown>)
  emitSection('Distress Analysis', report.distress as unknown as Record<string, unknown>)
  emitSection('Entitlement', report.entitlement as unknown as Record<string, unknown>)

  // ── ZONING SECTION ─────────────────────────────────────────────────────────
  if (report.zoning) {
    w.heading('Zoning & Entitlement Details')
    const z = report.zoning
    const zoningRows: [string, DataPoint | undefined][] = [
      ['Zoning Code',        z.zoning_code],
      ['Permitted Uses',     z.permitted_uses],
      ['Max FAR',            z.max_far],
      ['Height Limit (ft)',  z.height_limit_ft],
      ['TOC Tier',           z.toc_tier],
      ['ED1 Eligible',       z.ed1_eligible],
      ['AB2011 Eligible',    z.ab2011_eligible],
      ['RSO Covered',        z.rso_covered],
      ['Max Units By-Right', z.max_units_by_right],
      ['Max Units TOC',      z.max_units_toc],
      ['Buildable SF',       z.buildable_sf],
    ]
    w.dataHeader()
    for (const [label, dp] of zoningRows) {
      w.dataRow(label, dp)
    }
    w.gap(8)
    w.text(`Overall Zoning Confidence: ${z.confidence_overall ?? '—'}%`, { size: 9, color: C_GRAY })
    w.gap(6)
  }

  // ── LADBS PERMITS & VIOLATIONS ─────────────────────────────────────────────
  w.heading('LADBS Permits & Violations')
  w.text(
    'Source: City of Los Angeles Building & Safety (data.lacity.org). ' +
    'Permit and violation counts reflect public records at time of query.',
    { size: 9, color: C_GRAY },
  )
  w.gap(6)

  if (report.zoning?.ladbs_violations) {
    w.dataHeader()
    w.dataRow('LADBS Active Violations', report.zoning.ladbs_violations)
    w.gap(4)
  } else {
    w.text('LADBS data: UNAVAILABLE — check data.lacity.org directly.', { size: 9, color: C_AMBER })
    w.gap(4)
  }

  if (report.distress?.ladbs_order_active) {
    w.dataRow('LADBS Order Active', report.distress.ladbs_order_active)
  }
  w.gap(8)

  // ── ENTITLEMENT SCREENING ──────────────────────────────────────────────────
  if (report.entitlement) {
    w.heading('Entitlement Screening')
    const e = report.entitlement
    const rows: [string, DataPoint | undefined][] = [
      ['Best Pathway',        e.best_pathway],
      ['Approval Probability',e.approval_probability],
      ['Timeline (months)',   e.timeline_months],
      ['IRR Impact (%)',      e.irr_impact_pct],
      ['Carry Cost/Month',    e.carry_cost_monthly],
      ['Jurisdiction Risk',   e.jurisdiction_risk],
    ]
    w.dataHeader()
    for (const [label, dp] of rows) w.dataRow(label, dp)
    w.gap(6)
  }

  // ── RISK FLAGS ─────────────────────────────────────────────────────────────
  w.heading('Risk Flags')
  if (!report.red_flags?.length) {
    w.text('No critical risk flags identified.', { size: 9, color: C_GREEN })
  } else {
    for (const flag of report.red_flags) {
      w.flagRow(flag)
    }
  }
  w.gap(6)

  // Assumptions
  if (report.assumptions?.length) {
    w.subheading('Assumptions & Caveats')
    for (const a of report.assumptions) w.bullet(a)
    w.gap(6)
  }

  // Unverified items
  if (report.unverified_items?.length) {
    w.subheading('Items Requiring Verification')
    for (const u of report.unverified_items) w.bullet(u)
    w.gap(6)
  }

  // ── SOURCE APPENDIX ────────────────────────────────────────────────────────
  w.heading('Source Appendix')
  w.text('All data sources queried for this report:', { size: 9, color: C_GRAY })
  w.gap(6)

  const sources: [string, string, string][] = [
    ['LA City ZIMAS',       'maps.lacity.org/lahub', 'Zoning code, FAR, height district — live query'],
    ['LA County Assessor',  'assessor.lacounty.gov', 'Lot size, year built, sale history'],
    ['LADBS',               'data.lacity.org',       'Building permits and code violations'],
    ['FEMA NFHL',           'hazards.fema.gov',      'Flood zone designation'],
    ['CalFire FHSZ',        'services1.arcgis.com',  'Fire hazard severity zone'],
    ['US Census / ACS5',    'api.censusreporter.org','Median income, rent burden'],
    ['HUD OZ',              'services.arcgis.com',   'Opportunity Zone designation'],
  ]

  for (const [name, url, desc] of sources) {
    w.ensure(22)
    w.page.drawText(name, { x: MARGIN, y: w.y, size: 9, font: bold, color: C_DARK })
    w.page.drawText(url,  { x: MARGIN + 140, y: w.y, size: 9, font: mono, color: C_CYAN })
    w.y -= 13
    w.text(desc, { size: 8, color: C_GRAY, indent: 0 })
    w.gap(2)
  }

  w.gap(10)
  w.subheading('Skills Executed')
  for (const skill of report.skills_activated ?? []) {
    const icon = skill.activated ? '+' : 'x'
    const col  = skill.activated ? C_GREEN : C_RED
    w.ensure(14)
    w.page.drawText(icon, { x: MARGIN, y: w.y, size: 9, font: bold, color: col })
    w.page.drawText(
      `${skill.skill_name}  —  confidence ${skill.confidence}%  |  ${skill.data_freshness}` +
      (skill.error ? `  |  ERROR: ${skill.error.slice(0, 60)}` : ''),
      { x: MARGIN + 14, y: w.y, size: 8, font: mono, color: C_DARK },
    )
    w.y -= 13
  }

  // ── TIMESTAMP & AUDIT FOOTER ───────────────────────────────────────────────
  w.gap(16)
  w.hline(C_BG, 0.5)
  w.gap(4)
  w.text(`Audit ID: ${report.request_id}`, { size: 8, font: mono, color: C_GRAY })
  w.text(`Generated: ${report.generated_at}  |  Tier: ${report.tier}  |  Cache hit: ${report.cache_hit}`, {
    size: 8, font: mono, color: C_GRAY,
  })
  w.gap(8)

  // ── DISCLAIMER ─────────────────────────────────────────────────────────────
  w.ensure(60)
  w.page.drawRectangle({ x: MARGIN, y: w.y - 50, width: CONTENT_W, height: 58, color: C_BG })
  w.y -= 4
  w.text('DISCLAIMER', { size: 8, font: bold, color: C_AMBER, indent: 6 })
  w.text(report.disclaimer, { size: 7.5, color: C_DARK, indent: 6, maxW: CONTENT_W - 12 })
  w.text(
    'Verified public-record data is separated from AI interpretation throughout this report. ' +
    'Fields marked INFERRED are AI-generated estimates and must be independently verified before any transaction.',
    { size: 7.5, color: C_GRAY, indent: 6, maxW: CONTENT_W - 12 },
  )

  // Page numbers
  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`SevenNova.ai  |  Page ${i + 1} of ${pages.length}  |  ${report.address.full_address.slice(0, 50)}`, {
      x: MARGIN, y: 22, size: 7, font: reg, color: C_GRAY,
    })
  }

  return doc.save()
}
