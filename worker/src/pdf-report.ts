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
import type { SourceResult } from './sources/adapter'

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
    case 'MODEL_ESTIMATE':     return C_CYAN
    default:                   return C_GRAY
  }
}

function statusBadgeText(status?: string): string {
  switch (status) {
    case 'VERIFIED':           return 'VERIFIED'
    case 'UNAVAILABLE':        return 'UNAVAILABLE'
    case 'NEEDS_HUMAN_REVIEW': return 'NEEDS REVIEW'
    case 'INFERRED':           return 'AI ESTIMATE'
    case 'MODEL_ESTIMATE':     return 'MODEL ESTIMATE'
    default:                   return 'UNVERIFIED'
  }
}

function tierLabel(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'developer':     return 'DEVELOPER REPORT'
    case 'institutional': return 'INSTITUTIONAL REPORT'
    case 'pro':           return 'PRO REPORT'
    case 'full':          return 'FULL REPORT'
    case 'basic':         return 'STARTER REPORT'
    default:              return tier.toUpperCase() + ' REPORT'
  }
}

function tierBadgeColor(tier: string) {
  switch (tier.toLowerCase()) {
    case 'developer':
    case 'institutional': return C_GREEN
    case 'pro':
    case 'full':          return C_CYAN
    default:              return C_MED
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

  // Simple multi-column row (no DataPoint wrapping) — for pro forma tables
  simpleRow(cols: string[], xs: number[]) {
    this.ensure(16)
    if (this.pageNum % 2 === 0) {
      this.page.drawRectangle({ x: MARGIN, y: this.y - 3, width: CONTENT_W, height: 14, color: rgb(0.975, 0.977, 0.980), opacity: 0.5 })
    }
    for (let i = 0; i < cols.length; i++) {
      const isFirst = i === 0
      this.page.drawText(cols[i].slice(0, 38), { x: MARGIN + xs[i], y: this.y, size: 8.5, font: isFirst ? this.bold : this.reg, color: C_DARK })
    }
    this.y -= 15
  }

  // Key-value pair for cover / summary info
  kv(label: string, value: string, valueColor = C_DARK) {
    this.ensure(16)
    this.page.drawText(label + ':', { x: MARGIN, y: this.y, size: 9, font: this.bold, color: C_GRAY })
    this.page.drawText(safeStr(value, 90), { x: MARGIN + 130, y: this.y, size: 9, font: this.reg, color: valueColor })
    this.y -= 15
  }
}

// ── SOURCE CONFIDENCE TABLE ───────────────────────────────────────────────────
function sourceStatusColor(status: string) {
  switch (status) {
    case 'VERIFIED':            return C_GREEN
    case 'UNAVAILABLE':         return C_RED
    case 'NEEDS_HUMAN_REVIEW':  return C_AMBER
    case 'AI_ESTIMATE':         return C_AMBER
    default:                    return C_GRAY
  }
}

function sourceStatusBadge(status: string): string {
  switch (status) {
    case 'VERIFIED':            return 'VERIFIED'
    case 'UNAVAILABLE':         return 'UNAVAILABLE'
    case 'NEEDS_HUMAN_REVIEW':  return 'NEEDS REVIEW'
    case 'AI_ESTIMATE':         return 'AI ESTIMATE'
    default:                    return status
  }
}

function classificationLabel(c: string): string {
  switch (c) {
    case 'PUBLIC_RECORD':                           return 'Public Record'
    case 'OFFICIAL_PORTAL_ONLY':                    return 'Portal Only'
    case 'API_AVAILABLE_BUT_SUBSCRIPTION_REQUIRED': return 'Subscription'
    case 'MANUAL_REVIEW_REQUIRED':                  return 'Manual Review'
    case 'PAID_PORTAL':                             return 'Paid Portal'
    case 'MARKET_LEVEL_ONLY':                       return 'Market Level'
    case 'AI_INFERENCE':                            return 'AI Inference'
    default:                                        return c
  }
}

function drawSourceConfidencePage(
  w: Writer,
  bold: PDFFont,
  reg: PDFFont,
  mono: PDFFont,
  sources: SourceResult[],
  hasManualReview: boolean,
): void {
  w.newPage()

  // Section header
  w.page.drawRectangle({ x: 0, y: w.y - 4, width: PAGE_W, height: 28, color: C_BG2 })
  w.page.drawRectangle({ x: 0, y: w.y - 4, width: 4, height: 28, color: C_CYAN })
  w.page.drawText('SOURCE CONFIDENCE TABLE', { x: MARGIN + 10, y: w.y + 8, size: 11, font: bold, color: C_NAVY })
  w.page.drawText('Public record sources queried for this report — each source independently verified', {
    x: MARGIN + 10, y: w.y - 4, size: 7.5, font: reg, color: C_GRAY,
  })
  w.y -= 32

  // Column headers
  const COL_SOURCE  = 0
  const COL_CLASS   = 145
  const COL_STATUS  = 235
  const COL_CONF    = 315
  const COL_MACHINE = 355
  const COL_NOTES   = 395

  w.page.drawRectangle({ x: MARGIN, y: w.y - 3, width: CONTENT_W, height: 15, color: C_BG2 })
  const hdrSize = 7.5
  const hdrColor = C_MED
  w.page.drawText('SOURCE',       { x: MARGIN + COL_SOURCE,  y: w.y, size: hdrSize, font: bold, color: hdrColor })
  w.page.drawText('TYPE',         { x: MARGIN + COL_CLASS,   y: w.y, size: hdrSize, font: bold, color: hdrColor })
  w.page.drawText('STATUS',       { x: MARGIN + COL_STATUS,  y: w.y, size: hdrSize, font: bold, color: hdrColor })
  w.page.drawText('CONF',         { x: MARGIN + COL_CONF,    y: w.y, size: hdrSize, font: bold, color: hdrColor })
  w.page.drawText('API',          { x: MARGIN + COL_MACHINE, y: w.y, size: hdrSize, font: bold, color: hdrColor })
  w.page.drawText('NOTES',        { x: MARGIN + COL_NOTES,   y: w.y, size: hdrSize, font: bold, color: hdrColor })
  w.y -= 17

  // Source rows
  let rowNum = 0
  for (const src of sources) {
    w.ensure(16)
    if (rowNum % 2 === 0) {
      w.page.drawRectangle({ x: MARGIN, y: w.y - 3, width: CONTENT_W, height: 14, color: C_BG, opacity: 0.6 })
    }

    const statusCol = sourceStatusColor(src.status)
    const badge = sourceStatusBadge(src.status)

    // Source name (truncated)
    w.page.drawText(src.source_name.slice(0, 24), { x: MARGIN + COL_SOURCE, y: w.y, size: 8, font: bold, color: C_DARK })
    // Classification
    w.page.drawText(classificationLabel(src.classification), { x: MARGIN + COL_CLASS, y: w.y, size: 7.5, font: reg, color: C_MED })
    // Status badge
    const bw = 72
    w.page.drawRectangle({ x: MARGIN + COL_STATUS, y: w.y - 2, width: bw, height: 11, color: statusCol, opacity: 0.12 })
    w.page.drawText(badge, { x: MARGIN + COL_STATUS + 2, y: w.y, size: 7, font: bold, color: statusCol })
    // Confidence
    w.page.drawText(src.status === 'VERIFIED' ? `${src.confidence}%` : '-', { x: MARGIN + COL_CONF, y: w.y, size: 7.5, font: mono, color: C_GRAY })
    // Machine readable
    w.page.drawText(src.machine_readable ? '[OK]' : '[FAIL]', { x: MARGIN + COL_MACHINE, y: w.y, size: 7.5, font: mono, color: src.machine_readable ? C_GREEN : C_AMBER })
    // Notes (short)
    const noteText = (src.notes ?? src.fallback_behavior).slice(0, 45)
    w.page.drawText(noteText, { x: MARGIN + COL_NOTES, y: w.y, size: 6.5, font: reg, color: C_GRAY })

    w.y -= 15
    rowNum++
  }

  w.gap(14)

  // Summary counts
  const verified = sources.filter(s => s.status === 'VERIFIED').length
  const unavailable = sources.filter(s => s.status === 'UNAVAILABLE').length
  const needsReview = sources.filter(s => s.status === 'NEEDS_HUMAN_REVIEW').length

  w.page.drawRectangle({ x: MARGIN, y: w.y - 28, width: CONTENT_W, height: 36, color: C_BG })
  w.y -= 6
  w.page.drawText(`${verified} VERIFIED    ${unavailable} UNAVAILABLE    ${needsReview} MANUAL REVIEW REQUIRED`, {
    x: MARGIN + 10, y: w.y, size: 9, font: bold, color: C_DARK,
  })
  w.y -= 14
  w.page.drawText(
    'VERIFIED = live API response received and parsed. UNAVAILABLE = source unreachable or no data returned. NEEDS REVIEW = portal-only source, human lookup required.',
    { x: MARGIN + 10, y: w.y, size: 7, font: reg, color: C_GRAY },
  )
  w.y -= 20

  // Manual Review Required section
  if (hasManualReview) {
    w.gap(8)
    w.page.drawRectangle({ x: MARGIN, y: w.y - 4, width: 3, height: 18, color: C_AMBER })
    w.page.drawText('MANUAL REVIEW REQUIRED', { x: MARGIN + 10, y: w.y, size: 10, font: bold, color: C_AMBER })
    w.y -= 14
    w.page.drawLine({ start: { x: MARGIN, y: w.y }, end: { x: MARGIN + CONTENT_W, y: w.y }, thickness: 0.5, color: C_LGRAY })
    w.y -= 8

    const reviewSources = sources.filter(s => s.status === 'NEEDS_HUMAN_REVIEW')
    for (const src of reviewSources) {
      w.ensure(32)
      w.page.drawText(src.source_name, { x: MARGIN + 4, y: w.y, size: 9, font: bold, color: C_DARK })
      w.y -= 12
      w.page.drawText(`Portal: ${src.source_url.slice(0, 90)}`, { x: MARGIN + 12, y: w.y, size: 7.5, font: mono, color: C_CYAN })
      w.y -= 11
      if (src.notes) {
        w.page.drawText(src.notes.slice(0, 100), { x: MARGIN + 12, y: w.y, size: 7.5, font: reg, color: C_MED })
        w.y -= 11
      }
      w.y -= 4
    }
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

// ── EXECUTIVE SUMMARY CARD ────────────────────────────────────────────────────
function drawExecutiveSummaryPage(w: Writer, bold: PDFFont, reg: PDFFont, report: PropertyReport): void {
  w.newPage()

  // Page header band
  w.page.drawRectangle({ x: 0, y: w.y - 4, width: PAGE_W, height: 30, color: C_BG2 })
  w.page.drawRectangle({ x: 0, y: w.y - 4, width: 4, height: 30, color: C_CYAN })
  w.page.drawText('EXECUTIVE SUMMARY', { x: MARGIN + 10, y: w.y + 10, size: 12, font: bold, color: C_NAVY })
  w.page.drawText('Key findings at a glance — full analysis follows on subsequent pages', {
    x: MARGIN + 10, y: w.y - 3, size: 7.5, font: reg, color: C_GRAY,
  })
  w.y -= 38

  const ea  = report.entitlement_detailed
  const pmR = report.profit_model_data
  const z   = report.zoning

  // ── 6-cell metric grid ──────────────────────────────────────────────────────
  const metrics: [string, string][] = [
    ['ZONING CODE',        safeStr(z?.zoning_code?.value)],
    ['TOC TIER',           safeStr(z?.toc_tier?.value)],
    ['MAX FAR',            safeStr(z?.max_far?.value)],
    ['HEIGHT LIMIT (FT)',  safeStr(z?.height_limit_ft?.value)],
    ['UNITS — BY RIGHT',   ea?.units_by_right != null ? String(ea.units_by_right) : '-'],
    ['UNITS — MAX (ANY)',  ea?.units_max_any_path != null ? String(ea.units_max_any_path) : '-'],
  ]

  const cols = 3
  const cellW = Math.floor(CONTENT_W / cols)
  const cellH = 44
  const gridRows = Math.ceil(metrics.length / cols)

  for (let i = 0; i < metrics.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx  = MARGIN + col * cellW
    const cy  = w.y - row * (cellH + 4)

    w.page.drawRectangle({ x: cx + 1, y: cy - cellH + 4, width: cellW - 4, height: cellH, color: C_BG })
    w.page.drawText(metrics[i][0], { x: cx + 7, y: cy - 6, size: 6.5, font: bold, color: C_GRAY })
    w.page.drawText(metrics[i][1].slice(0, 20), { x: cx + 7, y: cy - 20, size: 11, font: bold, color: C_DARK })
  }
  w.y -= gridRows * (cellH + 4) + 10

  // ── Recommended entitlement path card ──────────────────────────────────────
  if (ea?.recommended_path) {
    const rp = ea.recommended_path
    w.ensure(56)
    w.page.drawRectangle({ x: MARGIN, y: w.y - 50, width: CONTENT_W, height: 56, color: C_BG2 })
    w.page.drawRectangle({ x: MARGIN, y: w.y - 50, width: 4, height: 56, color: C_CYAN })
    w.page.drawText('RECOMMENDED ENTITLEMENT PATH', { x: MARGIN + 10, y: w.y - 4, size: 7, font: bold, color: C_GRAY })
    w.page.drawText(rp.name, { x: MARGIN + 10, y: w.y - 18, size: 12, font: bold, color: C_CYAN })
    const tMin = rp.timeline_months?.min ?? '?'
    const tMax = rp.timeline_months?.max ?? '?'
    w.page.drawText(
      `${tMin}–${tMax} months  ·  ${rp.max_units} units max  ·  ${rp.affordable_requirement_pct}% affordable required`,
      { x: MARGIN + 10, y: w.y - 32, size: 8.5, font: reg, color: C_MED },
    )
    if (rp.citation?.section) {
      w.page.drawText(`Citation: ${rp.citation.source} ${rp.citation.section}`, { x: MARGIN + 10, y: w.y - 43, size: 7, font: reg, color: C_GRAY })
    }
    w.y -= 62
  }

  // ── Deal signal + IRR row ───────────────────────────────────────────────────
  if (pmR) {
    const pm = pmR as unknown as Record<string, unknown>
    const signal = (pm.deal_signal ?? '') as string
    const signalColor = signal === 'GO' ? C_GREEN : signal === 'BORDERLINE' ? C_AMBER : C_RED
    w.ensure(54)
    w.page.drawRectangle({ x: MARGIN, y: w.y - 48, width: CONTENT_W, height: 54, color: C_BG })
    w.page.drawRectangle({ x: MARGIN, y: w.y - 48, width: 4, height: 54, color: signalColor })

    // Deal signal
    w.page.drawText('DEAL SIGNAL', { x: MARGIN + 10, y: w.y - 4, size: 7, font: bold, color: C_GRAY })
    w.page.drawText(String(signal), { x: MARGIN + 10, y: w.y - 20, size: 16, font: bold, color: signalColor })

    // IRR (null = finance gate active: land price not user-provided)
    const irrVal = pm.irr_levered as number | null
    const irrGated = irrVal === null || irrVal === undefined
    const irr = irrGated ? 0 : irrVal
    const irrColor = irrGated ? C_GRAY : irr >= 20 ? C_GREEN : irr >= 12 ? C_AMBER : C_RED
    w.page.drawText('LEVERED IRR', { x: MARGIN + 120, y: w.y - 4, size: 7, font: bold, color: C_GRAY })
    w.page.drawText(irrGated ? 'NEEDS INPUT' : irr === -99 ? 'N/A' : `${irr}%`,
      { x: MARGIN + 120, y: w.y - 20, size: irrGated ? 9 : 16, font: bold, color: irrColor })

    // Max land price (null = finance gate active)
    const maxLandVal = pm.max_land_price_at_target_irr as number | null
    const maxLandGated = maxLandVal === null || maxLandVal === undefined
    const maxLand = maxLandGated ? 0 : maxLandVal
    w.page.drawText('MAX LAND @ 20% IRR', { x: MARGIN + 230, y: w.y - 4, size: 7, font: bold, color: C_GRAY })
    w.page.drawText(maxLandGated ? 'NEEDS INPUT' : maxLand >= 1_000_000 ? `$${(maxLand / 1_000_000).toFixed(2)}M` : `$${maxLand.toLocaleString()}`,
      { x: MARGIN + 230, y: w.y - 20, size: maxLandGated ? 9 : 16, font: bold, color: maxLandGated ? C_GRAY : C_GREEN })

    // Confidence
    w.page.drawText('MODEL CONFIDENCE', { x: MARGIN + 390, y: w.y - 4, size: 7, font: bold, color: C_GRAY })
    const conf = (pm.confidence ?? 'LOW') as string
    const confColor = conf === 'HIGH' ? C_GREEN : conf === 'MEDIUM' ? C_AMBER : C_RED
    w.page.drawText(conf, { x: MARGIN + 390, y: w.y - 20, size: 13, font: bold, color: confColor })

    // Deal signal reason (wrap to 2 lines at ~115 chars each, word boundary)
    if (pm.deal_signal_reason) {
      const fullReason = String(pm.deal_signal_reason)
      const LINE_LEN = 115
      if (fullReason.length <= LINE_LEN) {
        w.page.drawText(fullReason, { x: MARGIN + 10, y: w.y - 36, size: 7.5, font: reg, color: C_MED })
      } else {
        const split = fullReason.lastIndexOf(' ', LINE_LEN)
        const line1 = fullReason.slice(0, split > 0 ? split : LINE_LEN)
        const rest  = fullReason.slice(line1.length + 1)
        const line2 = rest.length > LINE_LEN ? rest.slice(0, rest.lastIndexOf(' ', LINE_LEN) || LINE_LEN) + '…' : rest
        w.page.drawText(line1, { x: MARGIN + 10, y: w.y - 36, size: 7.5, font: reg, color: C_MED })
        w.page.drawText(line2, { x: MARGIN + 10, y: w.y - 47, size: 7.5, font: reg, color: C_MED })
      }
    }
    w.y -= 60
  }

  // ── Human review warning ────────────────────────────────────────────────────
  const needsReview = !!(ea?.human_review_required || (report.profit_model_data as unknown as Record<string, unknown>)?.human_review_required)
  if (needsReview) {
    w.ensure(44)
    w.page.drawRectangle({ x: MARGIN, y: w.y - 38, width: CONTENT_W, height: 44, color: rgb(0.75, 0.44, 0.02), opacity: 0.07 })
    w.page.drawRectangle({ x: MARGIN, y: w.y - 38, width: 4, height: 44, color: C_AMBER })
    w.page.drawText('HUMAN REVIEW REQUIRED', { x: MARGIN + 10, y: w.y - 4, size: 9, font: bold, color: C_AMBER })
    w.page.drawText(
      'One or more parcel inputs are missing, inferred, or uncertain. Entitlement eligibility flags and pro forma figures are for ' +
      'screening only. Verify with a licensed land use attorney, planning consultant, and licensed appraiser before reliance.',
      { x: MARGIN + 10, y: w.y - 18, size: 7.5, font: reg, color: C_DARK },
    )
    w.y -= 50
  }

  w.gap(6)
  w.hline(C_LGRAY)
  w.gap(4)
  w.text('Full analysis begins on the following page — Verified Data, Entitlement Pathways, Pro Forma, Source Registry.', { size: 8, color: C_GRAY })
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
  // Deep navy header band
  w.page.drawRectangle({ x: 0, y: PAGE_H - 120, width: PAGE_W, height: 120, color: C_NAVY })

  // Brand line: SevenNova.ai
  w.page.drawText('SEVENNOVA', { x: MARGIN, y: PAGE_H - 38, size: 18, font: bold, color: C_CYAN })
  w.page.drawText('.AI', { x: MARGIN + 118, y: PAGE_H - 38, size: 14, font: bold, color: C_WHITE })

  // Report title
  w.page.drawText('LA DEVELOPMENT FEASIBILITY REPORT', {
    x: MARGIN, y: PAGE_H - 60, size: 12, font: bold, color: C_WHITE,
  })

  // Subtitle
  w.page.drawText('Entitlement Pathways · Developer Pro Forma · IRR Analysis · LA Public Record Verified', {
    x: MARGIN, y: PAGE_H - 76, size: 8, font: reg, color: rgb(0.65, 0.70, 0.78),
  })

  // Tier badge — right side of header
  const tLabel = tierLabel(report.tier)
  const tColor = tierBadgeColor(report.tier)
  const tBadgeW = 130
  w.page.drawRectangle({ x: PAGE_W - MARGIN - tBadgeW, y: PAGE_H - 76, width: tBadgeW, height: 18, color: tColor, opacity: 0.18 })
  w.page.drawRectangle({ x: PAGE_W - MARGIN - tBadgeW, y: PAGE_H - 76, width: tBadgeW, height: 18, borderColor: tColor, borderWidth: 0.8, opacity: 0 })
  w.page.drawText(tLabel, {
    x: PAGE_W - MARGIN - tBadgeW + 6, y: PAGE_H - 66, size: 8, font: bold, color: tColor,
  })

  // Disclaimer line in header
  w.page.drawText('PRELIMINARY FEASIBILITY ANALYSIS — NOT A LICENSED APPRAISAL OR LEGAL OPINION', {
    x: MARGIN, y: PAGE_H - 93, size: 6.5, font: bold, color: rgb(0.45, 0.50, 0.58),
  })

  // Cyan accent line
  w.page.drawRectangle({ x: 0, y: PAGE_H - 125, width: PAGE_W, height: 5, color: C_CYAN })

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
  w.kv('Report Tier',     tierLabel(report.tier), tierBadgeColor(report.tier))
  w.kv('Deal Score',      `${report.deal_score}  —  ${report.deal_score_rationale}`, dealCol)
  w.kv('Data Confidence', `${report.overall_confidence}%  ${report.overall_confidence < 50 ? '(LOW — see Human Review flags)' : ''}`,
    report.overall_confidence < 50 ? C_RED : C_GREEN)
  w.kv('Data Status',     report.data_freshness_summary)
  w.kv('Generated',       report.generated_at)
  w.kv('Audit ID',        report.request_id)
  if (userKey) w.kv('API Key', `${userKey.slice(0, 16)}...`)

  w.gap(14)

  // Cover disclaimer box
  w.page.drawRectangle({ x: MARGIN, y: w.y - 62, width: CONTENT_W, height: 70, color: C_BG2 })
  w.page.drawRectangle({ x: MARGIN, y: w.y - 62, width: 3, height: 70, color: C_AMBER })
  w.y -= 6
  w.text('DATA PROVENANCE & REPORT STATUS', { size: 8, font: bold, color: C_AMBER, indent: 8 })
  w.text(
    'VERIFIED fields are sourced from live public-record government APIs (ZIMAS, LADBS, FEMA, USGS, CalFire, Census, HUD). ' +
    'AI ESTIMATE fields are model-generated and have not been verified against a primary source — quarantined to a separate section. ' +
    'MODEL ESTIMATE fields (Pro Forma, IRR) are based on default market assumptions and require replacement with actual bids, appraisal, and lender terms. ' +
    'This report is preliminary feasibility analysis only. Not a licensed appraisal, legal opinion, architectural opinion, or permit approval guarantee.',
    { size: 7.5, color: C_DARK, indent: 8, maxW: CONTENT_W - 16 },
  )

  // ── PAGE 2 — EXECUTIVE SUMMARY CARD ──────────────────────────────────────
  drawExecutiveSummaryPage(w, bold, reg, report)

  // ── PAGE 3 — SOURCE CONFIDENCE TABLE ─────────────────────────────────────
  if (report.source_registry?.length) {
    drawSourceConfidencePage(w, bold, reg, mono, report.source_registry, report.manual_review_required ?? false)
  }

  // ── PAGE 4 — VERIFIED DATA SUMMARY ────────────────────────────────────────
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

  // ── ENTITLEMENT STRATEGY (detailed pathways) ──────────────────────────────
  if (report.entitlement_detailed) {
    const ed = report.entitlement_detailed
    w.heading('Entitlement Strategy — Pathway Analysis')
    w.text('Ranked development pathways based on LA zoning code and state statutes. Every eligibility flag cites the applicable LAMC section or California statute.', { size: 8.5, color: C_MED })
    w.gap(6)

    // Human review banner
    if (ed.human_review_required) {
      w.ensure(38)
      w.page.drawRectangle({ x: MARGIN, y: w.y - 32, width: CONTENT_W, height: 38, color: rgb(0.75, 0.44, 0.02), opacity: 0.07 })
      w.page.drawRectangle({ x: MARGIN, y: w.y - 32, width: 3, height: 38, color: C_AMBER })
      w.page.drawText('HUMAN REVIEW REQUIRED', { x: MARGIN + 8, y: w.y - 3, size: 8.5, font: bold, color: C_AMBER })
      w.page.drawText(
        'One or more required parcel inputs are missing, inferred, or uncertain. Eligibility flags are for screening only, not a final legal determination. ' +
        'Verify with a licensed land use attorney or planning consultant.',
        { x: MARGIN + 8, y: w.y - 16, size: 7.5, font: reg, color: C_DARK },
      )
      w.y -= 44
    }

    // Recommended path highlight box
    if (ed.recommended_path) {
      const rp = ed.recommended_path
      w.ensure(58)
      w.page.drawRectangle({ x: MARGIN, y: w.y - 52, width: CONTENT_W, height: 58, color: C_BG2 })
      w.page.drawRectangle({ x: MARGIN, y: w.y - 52, width: 4, height: 58, color: C_CYAN })
      w.page.drawText('RECOMMENDED PATH', { x: MARGIN + 10, y: w.y - 4, size: 7, font: bold, color: C_GRAY })
      w.page.drawText(rp.name, { x: MARGIN + 10, y: w.y - 18, size: 12, font: bold, color: C_CYAN })
      const tMin = rp.timeline_months?.min ?? '?'
      const tMax = rp.timeline_months?.max ?? '?'
      w.page.drawText(
        `${tMin}–${tMax} months  ·  ${rp.max_units} units max  ·  ${rp.affordable_requirement_pct}% affordable required`,
        { x: MARGIN + 10, y: w.y - 32, size: 9, font: reg, color: C_MED },
      )
      if (rp.citation?.section) {
        w.page.drawText(`Citation: ${rp.citation.source} ${rp.citation.section}`, { x: MARGIN + 10, y: w.y - 44, size: 7.5, font: reg, color: C_GRAY })
      }
      w.y -= 60
    }

    // Summary metrics
    w.gap(4)
    const metricItems = [
      `By-Right Eligible: ${ed.by_right_eligible ? 'YES' : 'NO'}`,
      `Streamlined Eligible: ${ed.streamlined_eligible ? 'YES' : 'NO'}`,
      `Entitlement Risk Score: ${ed.entitlement_risk_score}/10  (10 = highest risk)`,
      `Est. Permit Fees: $${(ed.estimated_permit_fees ?? 0).toLocaleString()}`,
      `Max Units (any path): ${ed.units_max_any_path}`,
    ]
    for (const item of metricItems) w.bullet(item)
    w.gap(8)

    // Pathway comparison table
    w.subheading('Pathway Comparison')
    w.tableHeader(['PATHWAY', 'CATEGORY', 'TIMELINE', 'MAX UNITS', 'AFFORDABLE %', 'CITATION'], [2, 120, 200, 280, 350, 420])
    for (const p of ed.pathways) {
      const tLabel = p.timeline_months ? `${p.timeline_months.min}–${p.timeline_months.max}mo` : '?'
      const cLabel = `${p.citation.source} ${p.citation.section}`.substring(0, 30)
      w.simpleRow([p.name.substring(0, 25), p.category, tLabel, String(p.max_units), `${p.affordable_requirement_pct}%`, cLabel], [2, 120, 200, 280, 350, 420])
    }
    w.gap(8)

    // Stacked incentives — with verification warning
    if (ed.stacked_incentives.length > 0) {
      w.subheading('Potentially Stackable Incentive Programs')
      w.ensure(32)
      w.page.drawRectangle({ x: MARGIN, y: w.y - 26, width: CONTENT_W, height: 30, color: C_BG2 })
      w.page.drawRectangle({ x: MARGIN, y: w.y - 26, width: 3, height: 30, color: C_AMBER })
      w.page.drawText('ELIGIBILITY WARNING', { x: MARGIN + 8, y: w.y - 3, size: 7.5, font: bold, color: C_AMBER })
      w.page.drawText(
        'The following programs may apply to this parcel based on zoning and TOC eligibility. ' +
        'Subsidy estimates are illustrative only. Actual eligibility, award amounts, and funding availability require application and approval.',
        { x: MARGIN + 8, y: w.y - 15, size: 7, font: reg, color: C_DARK },
      )
      w.y -= 34
      for (const inc of ed.stacked_incentives) {
        w.bullet(`${inc.program} (${inc.type})  —  Est. $${(inc.estimated_subsidy_per_unit ?? 0).toLocaleString()}/unit  |  Stacks with: ${inc.stacks_with.join(', ')}  |  Cite: ${inc.citation.source} ${inc.citation.section}`)
      }
    }

    // data_basis note
    w.gap(6)
    w.hline(C_LGRAY)
    w.text(`DATA BASIS: ${ed.data_basis}`, { size: 7, color: C_GRAY })
    w.gap(8)
  }

  // ── DEVELOPER PRO FORMA ────────────────────────────────────────────────────
  if (report.profit_model_data && 'total_development_cost' in report.profit_model_data) {
    const pm = report.profit_model_data
    const pmAny = pm as unknown as Record<string, unknown>
    w.heading('Developer Pro Forma')
    w.text('Market-rate development feasibility. Replace default assumptions with actual land price, rent, and contractor bids before any investment commitment.', { size: 8.5, color: C_MED })
    w.gap(4)

    // MODEL ESTIMATE status banner
    w.ensure(26)
    w.page.drawRectangle({ x: MARGIN, y: w.y - 20, width: CONTENT_W, height: 26, color: C_BG2 })
    w.page.drawRectangle({ x: MARGIN, y: w.y - 20, width: 3, height: 26, color: C_CYAN })
    w.page.drawText('MODEL ESTIMATE', { x: MARGIN + 8, y: w.y - 3, size: 8, font: bold, color: C_CYAN })
    w.page.drawText(
      'All figures are model-estimated using default LA market assumptions. ' +
      `Confidence: ${pm.confidence}. Not verified bids, appraisal, lender quote, or final underwriting.`,
      { x: MARGIN + 110, y: w.y - 3, size: 7.5, font: reg, color: C_MED },
    )
    w.y -= 30

    // Human review banner
    if (pmAny.human_review_required) {
      w.ensure(30)
      w.page.drawRectangle({ x: MARGIN, y: w.y - 24, width: CONTENT_W, height: 30, color: rgb(0.75, 0.44, 0.02), opacity: 0.07 })
      w.page.drawRectangle({ x: MARGIN, y: w.y - 24, width: 3, height: 30, color: C_AMBER })
      w.page.drawText('HUMAN REVIEW REQUIRED', { x: MARGIN + 8, y: w.y - 3, size: 8, font: bold, color: C_AMBER })
      w.page.drawText(
        'Land price, rent, and/or construction type are default assumptions, not verified inputs. ' +
        'Replace with your actual deal parameters before reliance on IRR or max land price.',
        { x: MARGIN + 8, y: w.y - 15, size: 7.5, font: reg, color: C_DARK },
      )
      w.y -= 36
    }

    w.gap(4)

    // Deal signal banner
    const signalColor = pm.deal_signal === 'GO' ? C_GREEN : pm.deal_signal === 'BORDERLINE' ? C_AMBER : C_RED
    w.subheading(`Deal Signal: ${pm.deal_signal ?? '?'}`)
    w.text(pm.deal_signal_reason ?? '', { size: 8.5, color: signalColor })
    w.gap(6)

    // Cost stack
    w.subheading('Construction Cost Stack')
    const costRows = [
      ['Land Price (est.)', `$${pm.land_price.toLocaleString()}`],
      ['Hard Costs', `$${pm.hard_costs_total.toLocaleString()} ($${pm.hard_costs_per_sf}/sf, ${pm.construction_type})`],
      ['Soft Costs (20%)', `$${pm.soft_costs_total.toLocaleString()}`],
      ['Permit Fees', `$${pm.permit_fees.toLocaleString()}`],
      ['Developer Fee + Contingency', `$${(pm.developer_fee + pm.contingency).toLocaleString()}`],
      ['TOTAL DEVELOPMENT COST', `$${pm.total_development_cost.toLocaleString()} ($${pm.cost_per_unit.toLocaleString()}/unit)`],
    ]
    w.tableHeader(['LINE ITEM', 'AMOUNT'], [2, 280])
    for (const [label, val] of costRows) w.simpleRow([label, val], [2, 280])
    w.gap(6)

    // Returns summary
    w.subheading('Returns Summary')
    const returnRows = [
      ['Units Modeled', String(pm.buildable_units)],
      ['Avg Rent/Unit/Mo', `$${pm.avg_rent_per_unit_mo.toLocaleString()}`],
      ['NOI', `$${pm.net_operating_income.toLocaleString()}/yr`],
      ['Exit Value (4.5% cap)', `$${pm.exit_value.toLocaleString()} ($${pm.exit_price_per_unit.toLocaleString()}/unit)`],
      ['Debt (65% LTC)', `$${pm.debt_amount.toLocaleString()}`],
      ['Equity Required', `$${pm.equity_required.toLocaleString()}`],
      ['IRR (Levered)', pm.irr_levered === null || pm.irr_levered === undefined ? 'NEEDS INPUT — land price required' : `${pm.irr_levered}%`],
      ['Equity Multiple', `${pm.equity_multiple}x`],
      ['Cash-on-Cash Yr 1', `${pm.cash_on_cash_yr1}%`],
    ]
    w.tableHeader(['METRIC', 'VALUE'], [2, 280])
    for (const [label, val] of returnRows) w.simpleRow([label, val], [2, 280])
    w.gap(6)

    // Max offer price (suppressed when finance gate active)
    w.subheading('Max Supportable Land Price @ 20% Target IRR')
    if (pm.max_land_price_at_target_irr === null || pm.max_land_price_at_target_irr === undefined) {
      w.text('NEEDS INPUT — user-provided land price required before max land price can be calculated.', { size: 9, color: C_GRAY })
    } else {
      w.text(`$${pm.max_land_price_at_target_irr.toLocaleString()} total  |  $${(pm.max_land_price_per_unit ?? 0).toLocaleString()}/unit`, { size: 11, color: pm.deal_signal === 'GO' ? C_GREEN : C_RED })
    }
    w.gap(4)

    // Sensitivity
    if (pm.sensitivity?.rows?.length) {
      w.subheading('Sensitivity Analysis')
      w.tableHeader(['SCENARIO', 'RENT ±%', 'COST ±%', 'IRR LEVERED', 'EQUITY MULTIPLE'], [2, 130, 210, 300, 390])
      for (const row of pm.sensitivity.rows) {
        w.simpleRow([
          row.label,
          `${row.rent_change_pct > 0 ? '+' : ''}${row.rent_change_pct}%`,
          `${row.construction_change_pct > 0 ? '+' : ''}${row.construction_change_pct}%`,
          `${row.irr_levered}%`,
          `${row.equity_multiple}x`,
        ], [2, 130, 210, 300, 390])
      }
    }
    w.gap(4)
    if (pmAny.development_note) w.text(String(pmAny.development_note), { size: 8, color: C_AMBER })

    // data_basis note
    w.gap(6)
    w.hline(C_LGRAY)
    if (pmAny.data_basis) w.text(`DATA BASIS: ${String(pmAny.data_basis)}`, { size: 7, color: C_GRAY })
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

  // ── DISCLAIMER PAGE ───────────────────────────────────────────────────────
  w.newPage()

  // Header band for disclaimer
  w.page.drawRectangle({ x: 0, y: w.y - 4, width: PAGE_W, height: 30, color: C_NAVY })
  w.page.drawRectangle({ x: 0, y: w.y - 4, width: 4, height: 30, color: C_AMBER })
  w.page.drawText('DISCLAIMER & LEGAL NOTICE', { x: MARGIN + 10, y: w.y + 10, size: 11, font: bold, color: C_WHITE })
  w.page.drawText('Read before relying on any information contained in this report', {
    x: MARGIN + 10, y: w.y - 3, size: 7.5, font: reg, color: rgb(0.65, 0.68, 0.75),
  })
  w.y -= 40

  const disclaimerItems: [string, string][] = [
    [
      'PRELIMINARY FEASIBILITY ONLY',
      'This report is a preliminary development feasibility analysis tool intended for initial screening purposes only. It is not a final determination of development potential, permitting capacity, or investment viability.',
    ],
    [
      'NOT LEGAL ADVICE',
      'Nothing in this report constitutes legal advice. All zoning compliance determinations, entitlement eligibility conclusions, and code violation assessments require review by a licensed California real estate attorney. Statute citations are for reference only.',
    ],
    [
      'NOT ARCHITECTURAL OR ENGINEERING OPINION',
      'This report does not constitute an architectural opinion, structural engineering assessment, geotechnical evaluation, or environmental impact analysis. Site-specific constraints require evaluation by licensed professionals.',
    ],
    [
      'NO PERMIT APPROVAL GUARANTEE',
      'Identification of an entitlement pathway or eligibility flag does not guarantee permit approval by the City of Los Angeles, LA County, or any other agency. Approvals are subject to change in law, policy, and discretionary conditions.',
    ],
    [
      'NOT A LICENSED APPRAISAL',
      'This report does not constitute a licensed real estate appraisal, broker price opinion, or formal valuation. Pro forma figures, IRR estimates, and max land price calculations are model-generated using default assumptions and have not been verified against actual contractor bids, appraisal, or lender terms.',
    ],
    [
      'VERIFY WITH CITY AND LICENSED PROFESSIONALS',
      'Before relying on any finding in this report for acquisition, lending, permitting, or investment decisions, verify all data directly with the City of Los Angeles Planning Department, LADBS, and licensed real estate, legal, and financial professionals.',
    ],
    [
      'DATA PROVENANCE',
      'VERIFIED fields are sourced from live public-record government APIs at the time of report generation. UNAVAILABLE means the source query failed — not that the condition does not exist. AI ESTIMATE fields are model-generated and must be independently verified. MODEL ESTIMATE fields (pro forma) use default LA market assumptions.',
    ],
    [
      'MLS DATA EXCLUDED',
      'No comparable sales data is included in this report. Market value conclusions require a licensed MLS data feed and a licensed appraiser or broker. SevenNova does not provide licensed appraisal services.',
    ],
  ]

  if (report.disclaimer) {
    w.text(report.disclaimer, { size: 9 })
    w.gap(10)
    w.hline()
    w.gap(6)
  }

  for (const [title, body] of disclaimerItems) {
    w.ensure(50)
    w.page.drawText(title, { x: MARGIN, y: w.y, size: 8.5, font: bold, color: C_DARK })
    w.y -= 13
    w.text(body, { size: 8.5, color: C_MED })
    w.gap(8)
  }

  // Closing statement box
  w.ensure(44)
  w.page.drawRectangle({ x: MARGIN, y: w.y - 38, width: CONTENT_W, height: 44, color: C_BG2 })
  w.page.drawRectangle({ x: MARGIN, y: w.y - 38, width: 4, height: 44, color: C_NAVY })
  w.page.drawText('SevenNova.ai — LA Development Intelligence Platform', { x: MARGIN + 10, y: w.y - 6, size: 9, font: bold, color: C_NAVY })
  w.page.drawText('For questions about this report, contact support@sevennova.ai', { x: MARGIN + 10, y: w.y - 19, size: 8, font: reg, color: C_MED })
  w.page.drawText(`Report ID: ${report.request_id}  |  Generated: ${report.generated_at}`, { x: MARGIN + 10, y: w.y - 31, size: 7.5, font: mono, color: C_GRAY })
  w.y -= 48

  // ── FOOTER ON EVERY PAGE (runs after all pages including disclaimer) ────────
  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]
    pg.drawLine({ start: { x: MARGIN, y: 38 }, end: { x: PAGE_W - MARGIN, y: 38 }, thickness: 0.4, color: C_LGRAY })
    pg.drawText('SevenNova.ai  |  LA Development Feasibility Report  |  PRELIMINARY ANALYSIS — NOT A LICENSED APPRAISAL OR LEGAL OPINION', {
      x: MARGIN, y: 26, size: 6.5, font: reg, color: C_GRAY,
    })
    pg.drawText(`Audit ID: ${report.request_id}  |  ${report.generated_at}  |  Page ${i + 1} of ${pages.length}`, {
      x: MARGIN, y: 16, size: 6.5, font: mono, color: C_GRAY,
    })
  }

  return doc.save()
}
