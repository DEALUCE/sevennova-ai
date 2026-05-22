'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Design tokens (matches existing codebase) ────────────────────────────────
const S = {
  bg:        '#04080f',
  bg2:       '#070d18',
  bg3:       '#0a1220',
  accent:    '#00d4ff',
  text:      '#e8f0fe',
  textDim:   '#94a3b8',
  textMuted: '#5a7090',
  border:    'rgba(0,212,255,0.12)',
  borderDim: 'rgba(255,255,255,0.06)',
  font:      "'Space Mono', monospace",
};

// ─── API response types ───────────────────────────────────────────────────────
type DealSignal  = 'GO' | 'BORDERLINE' | 'NO-GO';
type Confidence  = 'HIGH' | 'MEDIUM' | 'LOW';
type CtType      = 'Type V' | 'Type III' | 'Type I';

interface Pathway {
  id: string;
  name: string;
  category: string;
  timeline: string;
  max_units: number;
  affordable_required_pct: number;
  key_requirements: string[];
  risks: string[];
  citation: string;
  citation_url?: string;
  speed_rank: number;
  units_rank: number;
  risk_rank: number;
}

interface PathwayRef {
  id: string;
  name: string;
  timeline: string;
  max_units: number;
  affordable_required_pct?: number;
  citation?: string;
}

interface EntitlementAnalysis {
  data_basis: string;
  human_review_required: boolean;
  pathways: Pathway[];
  fastest_path:     PathwayRef | null;
  most_units_path:  PathwayRef | null;
  lowest_risk_path: PathwayRef | null;
  recommended_path: PathwayRef | null;
  units_by_right: number;
  units_max_any_path: number;
  estimated_permit_fees: number;
  entitlement_risk_score: number;
  stacked_incentives: Array<{
    program: string;
    type: string;
    est_subsidy_per_unit: number;
    citation: string;
  }>;
}

interface ProfitModelApi {
  data_basis: string;
  human_review_required: boolean;
  units_modeled: number;
  land_price_used: number;
  avg_rent_per_unit_mo: number;
  construction_type: string;
  irr_levered: number;
  irr_unlevered: number;
  max_land_price_at_target_irr: number;
  max_land_price_per_unit: number;
  deal_signal: DealSignal;
  deal_signal_reason: string;
  confidence: Confidence;
  assumptions: string[];
  total_development_cost: number;
  hard_costs_total: number;
  soft_costs_total: number;
  net_operating_income: number;
  exit_value: number;
  equity_required: number;
}

interface ZoningResponse {
  address?: string;
  zone?: string;
  lot_size_sf?: number;
  entitlement_analysis?: EntitlementAnalysis;
  profit_model?: ProfitModelApi;
  error?: string;
}

// ─── Client-side pro forma math ───────────────────────────────────────────────
// Mirrors functions/api/zoning.js _computeProForma — do not change
const HARD_COST_PER_SF: Record<CtType, number> = {
  'Type V':   275,
  'Type III': 350,
  'Type I':   500,
};

interface ProFormaInputs {
  landPrice:        number;
  units:            number;
  avgUnitSf:        number;
  constructionType: CtType;
  rentPerUnit:      number;
  vacancyPct:       number;
  opexPct:          number;
  capRate:          number;
  ltcPct:           number;
  interestRate:     number;
  loanTerm:         number;
  holdYears:        number;
  permitFees:       number;
}

interface ProFormaResult {
  hardCosts:      number;
  softCosts:      number;
  tdc:            number;
  costPerUnit:    number;
  noi:            number;
  exitValue:      number;
  debt:           number;
  equity:         number;
  annualDebt:     number;
  irrLevered:     number;
  irrUnlevered:   number;
  equityMultiple: number;
  maxLandPrice:   number;
  dealSignal:     DealSignal;
}

function irrSolve(flows: number[]): number {
  const total = flows.reduce((s, v) => s + v, 0);
  if (total <= 0) {
    if (!flows.slice(1).some(v => v > 0)) return -99;
    let lo = -0.99, hi = 0;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const npv = flows.reduce((s, v, t) => s + v / Math.pow(1 + mid, t), 0);
      if (npv > 0) hi = mid; else lo = mid;
      if (hi - lo < 0.0001) break;
    }
    return Math.round((lo + hi) / 2 * 10000) / 100;
  }
  let r = 0.15;
  for (let i = 0; i < 80; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      const d = Math.pow(1 + r, t);
      npv  += flows[t] / d;
      dnpv -= t * flows[t] / Math.pow(1 + r, t + 1);
    }
    if (Math.abs(npv) < 1) break;
    if (Math.abs(dnpv) < 1e-10) { r += 0.01; continue; }
    r -= npv / dnpv;
    if (r < -0.99) r = -0.99;
    if (r > 5)     r = 5;
  }
  return Math.round(r * 10000) / 100;
}

function annualDebtService(principal: number, rateAnnual: number, termYears: number): number {
  const r = rateAnnual / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return (principal / n) * 12;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) * 12;
}

// Inner core — no max land solve, safe to call recursively from binary search
function computeCore(p: ProFormaInputs) {
  const hardCosts   = p.units * p.avgUnitSf * HARD_COST_PER_SF[p.constructionType];
  const softCosts   = hardCosts * 0.20;
  const devFee      = (hardCosts + softCosts) * 0.045;
  const contingency = (hardCosts + softCosts) * 0.05;
  const tdc         = p.landPrice + hardCosts + softCosts + p.permitFees + devFee + contingency;
  const gai         = p.units * p.rentPerUnit * 12;
  const noi         = gai * (1 - p.vacancyPct / 100) * (1 - p.opexPct / 100);
  const exitValue   = noi / (p.capRate / 100);
  const debt        = tdc * (p.ltcPct / 100);
  const equity      = tdc - debt;
  const annualDebt  = annualDebtService(debt, p.interestRate, p.loanTerm);

  const unlevFlows = [-tdc, ...Array(p.holdYears - 1).fill(noi), noi + exitValue];
  const irrUnlevered = irrSolve(unlevFlows);

  const levFlows = [-equity];
  for (let yr = 1; yr <= p.holdYears; yr++) {
    const cf = noi - annualDebt;
    levFlows.push(yr < p.holdYears ? cf : cf + exitValue - debt);
  }
  const irrLevered = irrSolve(levFlows);
  const totalReturn = levFlows.slice(1).reduce((s, v) => s + v, 0);
  const equityMultiple = equity > 0
    ? Math.round((equity + totalReturn) / equity * 100) / 100
    : 0;

  return { hardCosts, softCosts, tdc, noi, exitValue, debt, equity, annualDebt, irrLevered, irrUnlevered, equityMultiple };
}

function computeProForma(p: ProFormaInputs): ProFormaResult {
  const base = computeCore(p);

  // Binary search: max land price where levered IRR >= 20%
  let lo = 0, hi = Math.max(p.landPrice * 8, 5_000_000);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (computeCore({ ...p, landPrice: mid }).irrLevered >= 20) lo = mid; else hi = mid;
    if (hi - lo < 1000) break;
  }
  const maxLandPrice = Math.round(lo / 1000) * 1000;

  const dealSignal: DealSignal =
    base.irrLevered >= 20 && p.landPrice <= maxLandPrice ? 'GO' :
    base.irrLevered >= 16 || p.landPrice <= maxLandPrice * 1.15 ? 'BORDERLINE' :
    'NO-GO';

  return {
    hardCosts:      Math.round(base.hardCosts),
    softCosts:      Math.round(base.softCosts),
    tdc:            Math.round(base.tdc),
    costPerUnit:    p.units > 0 ? Math.round(base.tdc / p.units) : 0,
    noi:            Math.round(base.noi),
    exitValue:      Math.round(base.exitValue),
    debt:           Math.round(base.debt),
    equity:         Math.round(base.equity),
    annualDebt:     Math.round(base.annualDebt),
    irrLevered:     base.irrLevered,
    irrUnlevered:   base.irrUnlevered,
    equityMultiple: base.equityMultiple,
    maxLandPrice,
    dealSignal,
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
function irrLabel(v: number): string {
  return v === -99 ? 'N/A' : `${v}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DealBadge({ signal }: { signal: DealSignal }) {
  const c: Record<DealSignal, [string, string, string]> = {
    'GO':         ['rgba(34,197,94,0.12)',  'rgba(34,197,94,0.35)',  '#22c55e'],
    'BORDERLINE': ['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.35)', '#f59e0b'],
    'NO-GO':      ['rgba(239,68,68,0.12)',  'rgba(239,68,68,0.35)',  '#ef4444'],
  };
  const [bg, border, color] = c[signal];
  return (
    <span style={{
      display: 'inline-block', padding: '4px 14px',
      fontSize: '0.72rem', fontFamily: S.font, fontWeight: 700, letterSpacing: '0.12em',
      background: bg, border: `1px solid ${border}`, color,
    }}>
      {signal}
    </span>
  );
}

function ReviewBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
      padding: '11px 16px', marginBottom: 18,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ color: '#f59e0b', flexShrink: 0 }}>⚠</span>
      <p style={{ color: '#f59e0b', fontSize: '0.71rem', lineHeight: 1.6, margin: 0, fontFamily: S.font }}>
        {message}
      </p>
    </div>
  );
}

function DataBasisNote({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: '0.63rem', color: S.textMuted, marginTop: 14,
      fontFamily: S.font, lineHeight: 1.55,
      borderTop: `1px solid ${S.borderDim}`, paddingTop: 10,
    }}>
      ℹ {text}
    </p>
  );
}

function PathwayCard({
  label,
  pathway,
  full,
  isRecommended,
  isSelected,
  onClick,
}: {
  label: string;
  pathway: PathwayRef | null;
  full: Pathway | undefined;
  isRecommended: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  if (!pathway) {
    return (
      <div style={{
        background: S.bg2, border: `1px solid ${S.borderDim}`,
        padding: '18px 20px', flex: 1, minWidth: 220, opacity: 0.35,
      }}>
        <p style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
        <p style={{ fontSize: '0.78rem', color: S.textDim }}>Not eligible</p>
      </div>
    );
  }

  const borderColor = isRecommended ? '#22c55e' : isSelected ? S.accent : S.borderDim;
  const nameCcolor  = isRecommended ? '#22c55e' : S.accent;

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? 'rgba(0,212,255,0.03)' : S.bg2,
        border: `1px solid ${borderColor}`,
        padding: '18px 20px', flex: 1, minWidth: 220,
        cursor: 'pointer', transition: 'border-color 0.12s',
        position: 'relative',
      }}
    >
      {isRecommended && (
        <div style={{
          position: 'absolute', top: -1, right: 10,
          background: '#22c55e', color: '#04080f',
          fontSize: '0.56rem', fontFamily: S.font, fontWeight: 700,
          letterSpacing: '0.1em', padding: '2px 7px',
        }}>
          RECOMMENDED
        </div>
      )}

      <p style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: '0.86rem', color: nameCcolor, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
        {pathway.name}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 2 }}>MAX UNITS</p>
          <p style={{ fontSize: '1.1rem', color: S.text, fontWeight: 700 }}>{pathway.max_units}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 2 }}>TIMELINE</p>
          <p style={{ fontSize: '0.8rem', color: S.textDim, lineHeight: 1.3 }}>{pathway.timeline}</p>
        </div>
        {(full?.affordable_required_pct ?? 0) > 0 && (
          <div>
            <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 2 }}>AFFORDABLE</p>
            <p style={{ fontSize: '0.8rem', color: S.textDim }}>{full!.affordable_required_pct}%</p>
          </div>
        )}
      </div>

      {full && full.key_requirements.slice(0, 2).map((r, i) => (
        <p key={i} style={{ fontSize: '0.67rem', color: S.textDim, marginBottom: 3 }}>› {r}</p>
      ))}

      {full?.citation && (
        <p style={{ fontSize: '0.6rem', color: S.textMuted, borderTop: `1px solid ${S.borderDim}`, paddingTop: 8, marginTop: 8 }}>
          {full.citation}
        </p>
      )}

      {isSelected && (
        <p style={{ fontSize: '0.6rem', color: S.accent, marginTop: 8, letterSpacing: '0.06em' }}>
          ← Selected for pro forma
        </p>
      )}
    </div>
  );
}

function NumInput({
  label, value, onChange, prefix, suffix, step, min,
}: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; min?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ display: 'flex' }}>
        {prefix && (
          <span style={{
            background: S.bg3, border: `1px solid ${S.borderDim}`, borderRight: 'none',
            padding: '8px 10px', fontSize: '0.78rem', color: S.textMuted, fontFamily: S.font,
          }}>
            {prefix}
          </span>
        )}
        <input
          type="number" value={value} step={step ?? 1000} min={min ?? 0}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            flex: 1, background: S.bg3, border: `1px solid ${S.borderDim}`,
            color: S.text, fontFamily: S.font,
            padding: '8px 12px', fontSize: '0.82rem', outline: 'none', textAlign: 'right',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
          onBlur={e =>  (e.currentTarget.style.borderColor = S.borderDim)}
        />
        {suffix && (
          <span style={{
            background: S.bg3, border: `1px solid ${S.borderDim}`, borderLeft: 'none',
            padding: '8px 10px', fontSize: '0.78rem', color: S.textMuted, fontFamily: S.font,
          }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Report tier definitions ──────────────────────────────────────────────────
const REPORT_TIERS = [
  {
    id: 'basic',
    label: 'Starter',
    price: '$49',
    desc: 'Zoning screening · one-time report',
    recommended: false,
    features: [
      'Zoning code + FAR + height limit',
      'Entitlement eligibility flags',
      'By-right units estimate',
      'LADBS permit & violation check',
      'Seismic + flood risk',
      'PDF download',
    ],
  },
  {
    id: 'full',
    label: 'Pro',
    price: '$199',
    desc: 'Full feasibility · one-time report',
    recommended: true,
    features: [
      'Everything in Starter',
      'All entitlement pathways with LAMC citations',
      'Developer pro forma (IRR · NOI · TDC)',
      'Max land price @ 20% target IRR',
      '5-scenario sensitivity analysis',
      'Stackable incentives (TOC + LIHTC + HOME)',
      'Distress signals + DSCR estimate',
      'Climate risk + insurance stress score',
    ],
  },
  {
    id: 'institutional',
    label: 'Developer',
    price: '$499',
    desc: 'Institutional package · one-time report',
    recommended: false,
    features: [
      'Everything in Pro',
      'AI valuation ensemble (XGBoost + LightGBM + CatBoost)',
      'Market comparable analysis',
      'Legal entity graph',
      'Analyst review notes',
      'City Evidence Package',
    ],
  },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────
function ZoningReportInner() {
  const searchParams = useSearchParams();
  const [address, setAddress]               = useState(searchParams.get('address') ?? '');
  const [status,  setStatus]                = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [data,    setData]                  = useState<ZoningResponse | null>(null);
  const [apiError, setApiError]             = useState('');
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [computed,   setComputed]           = useState<ProFormaResult | null>(null);

  const [inputs, setInputs] = useState<ProFormaInputs>({
    landPrice: 500_000, units: 10, avgUnitSf: 850,
    constructionType: 'Type V', rentPerUnit: 2800,
    vacancyPct: 5, opexPct: 35, capRate: 4.5,
    ltcPct: 65, interestRate: 6.5, loanTerm: 30, holdYears: 5,
    permitFees: 20_000,
  });

  // Recompute pro forma on every input change
  useEffect(() => {
    if (inputs.units > 0) setComputed(computeProForma(inputs));
  }, [inputs]);

  // Seed inputs from API response once loaded
  useEffect(() => {
    if (!data) return;
    const ea = data.entitlement_analysis;
    const pm = data.profit_model;
    const recId = ea?.recommended_path?.id ?? null;
    setSelectedId(recId);
    setInputs(prev => ({
      ...prev,
      landPrice:        pm?.land_price_used          ?? prev.landPrice,
      units:            ea?.recommended_path?.max_units ?? pm?.units_modeled ?? prev.units,
      rentPerUnit:      pm?.avg_rent_per_unit_mo      ?? prev.rentPerUnit,
      constructionType: (pm?.construction_type as CtType) ?? prev.constructionType,
      permitFees:       ea?.estimated_permit_fees     ?? prev.permitFees,
    }));
  }, [data]);

  // When pathway card selection changes, update units
  useEffect(() => {
    if (!data?.entitlement_analysis || !selectedId) return;
    const full = data.entitlement_analysis.pathways.find(p => p.id === selectedId);
    if (full) setInputs(prev => ({ ...prev, units: full.max_units }));
  }, [selectedId, data]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setStatus('loading');
    setApiError('');
    setData(null);
    try {
      const res  = await fetch('/api/zoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });
      const json: ZoningResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setStatus('done');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Lookup failed');
      setStatus('error');
    }
  }

  const ea  = data?.entitlement_analysis;
  const pm  = data?.profit_model;
  const recId = ea?.recommended_path?.id;
  const fullOf = (id: string | undefined) =>
    id ? ea?.pathways.find(p => p.id === id) : undefined;

  return (
    <div style={{ background: S.bg, minHeight: '100vh', fontFamily: S.font, color: S.text }}>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${S.borderDim}`,
        background: 'rgba(4,8,15,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ color: S.accent, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em', textDecoration: 'none' }}>
            SEVEN<span style={{ color: S.text }}>NOVA</span><span style={{ color: S.accent, opacity: 0.5 }}>.ai</span>
          </Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/analyze" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>FULL REPORT</Link>
            <Link href="/pricing" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>PRICING</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
            Development Feasibility Engine
          </p>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: S.text, letterSpacing: '0.04em', margin: '0 0 6px' }}>
            ZONING <span style={{ color: S.accent }}>REPORT</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: S.textMuted, margin: 0 }}>
            Entitlement pathways · Developer pro forma · Live IRR calculator — Los Angeles only
          </p>
        </div>

        {/* Address form */}
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          <input
            type="text"
            placeholder="9432 Oakmore Rd, Los Angeles, CA 90035"
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
            style={{
              flex: 1, background: S.bg2, border: `1px solid ${S.borderDim}`,
              color: S.text, fontFamily: S.font, padding: '12px 16px',
              fontSize: '0.85rem', outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
            onBlur={e =>  (e.currentTarget.style.borderColor = S.borderDim)}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              padding: '12px 28px', background: status === 'loading' ? '#1a3a4a' : S.accent,
              color: status === 'loading' ? S.textMuted : S.bg,
              fontFamily: S.font, fontWeight: 700, fontSize: '0.78rem',
              letterSpacing: '0.1em', border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'loading' ? 'ANALYZING...' : 'ANALYZE →'}
          </button>
        </form>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '44px', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: `2px solid rgba(0,212,255,0.12)`, borderTop: `2px solid ${S.accent}`, borderRadius: '50%', margin: '0 auto 18px', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: S.accent, fontSize: '0.82rem', letterSpacing: '0.06em' }}>FETCHING ZONING DATA...</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', padding: '20px 24px' }}>
            <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>⚠ Lookup Failed</p>
            <p style={{ color: S.textDim, fontSize: '0.78rem' }}>{apiError}</p>
          </div>
        )}

        {/* ── Results ── */}
        {status === 'done' && data && ea && pm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Parcel summary strip */}
            <div style={{
              background: S.bg2, border: `1px solid ${S.borderDim}`,
              padding: '14px 20px', display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center',
            }}>
              {data.zone && (
                <div>
                  <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', marginBottom: 2 }}>ZONE</p>
                  <p style={{ fontSize: '0.92rem', color: S.accent, fontWeight: 700 }}>{data.zone}</p>
                </div>
              )}
              {data.lot_size_sf && (
                <div>
                  <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', marginBottom: 2 }}>LOT SIZE</p>
                  <p style={{ fontSize: '0.92rem', color: S.text }}>{fmt(data.lot_size_sf)} sf</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', marginBottom: 2 }}>BY-RIGHT UNITS</p>
                <p style={{ fontSize: '0.92rem', color: S.text }}>{ea.units_by_right}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', marginBottom: 2 }}>MAX (ANY PATH)</p>
                <p style={{ fontSize: '0.92rem', color: S.accent, fontWeight: 700 }}>{ea.units_max_any_path}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', marginBottom: 2 }}>RISK SCORE</p>
                <p style={{
                  fontSize: '0.92rem', fontWeight: 700,
                  color: ea.entitlement_risk_score >= 7 ? '#ef4444' : ea.entitlement_risk_score >= 4 ? '#f59e0b' : '#22c55e',
                }}>
                  {ea.entitlement_risk_score}/10
                </p>
              </div>
            </div>

            {/* ── Section 1: Entitlement Pathways ── */}
            <section style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '24px 28px' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 14 }}>
                Entitlement Pathways — click a card to use in pro forma
              </p>

              {ea.human_review_required && (
                <ReviewBanner message="HUMAN REVIEW REQUIRED — One or more parcel inputs are missing, inferred, or uncertain. Eligibility flags are for screening only, not a final legal determination. Verify with a licensed land use attorney or planning consultant before proceeding." />
              )}

              {/* 3 pathway cards */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
                <PathwayCard
                  label="⚡ Fastest Path"
                  pathway={ea.fastest_path}
                  full={fullOf(ea.fastest_path?.id)}
                  isRecommended={ea.fastest_path?.id === recId}
                  isSelected={selectedId === ea.fastest_path?.id}
                  onClick={() => ea.fastest_path && setSelectedId(ea.fastest_path.id)}
                />
                <PathwayCard
                  label="🏗 Most Units"
                  pathway={ea.most_units_path}
                  full={fullOf(ea.most_units_path?.id)}
                  isRecommended={ea.most_units_path?.id === recId}
                  isSelected={selectedId === ea.most_units_path?.id}
                  onClick={() => ea.most_units_path && setSelectedId(ea.most_units_path.id)}
                />
                <PathwayCard
                  label="🛡 Lowest Risk"
                  pathway={ea.lowest_risk_path}
                  full={fullOf(ea.lowest_risk_path?.id)}
                  isRecommended={ea.lowest_risk_path?.id === recId}
                  isSelected={selectedId === ea.lowest_risk_path?.id}
                  onClick={() => ea.lowest_risk_path && setSelectedId(ea.lowest_risk_path.id)}
                />
              </div>

              {/* Stackable incentives */}
              {ea.stacked_incentives.length > 0 && (
                <div style={{ borderTop: `1px solid ${S.borderDim}`, paddingTop: 14 }}>
                  <p style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Stackable Incentive Programs
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ea.stacked_incentives.map((inc, i) => (
                      <div key={i} style={{
                        background: 'rgba(0,212,255,0.04)', border: `1px solid ${S.border}`,
                        padding: '6px 12px',
                      }}>
                        <span style={{ fontSize: '0.68rem', color: S.accent }}>{inc.program}</span>
                        {inc.est_subsidy_per_unit > 0 && (
                          <span style={{ fontSize: '0.65rem', color: S.textMuted }}> · ~${fmt(inc.est_subsidy_per_unit)}/unit</span>
                        )}
                        <span style={{ fontSize: '0.6rem', color: S.textMuted, marginLeft: 6 }}>({inc.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DataBasisNote text={ea.data_basis} />
            </section>

            {/* ── Section 2: Pro Forma Builder ── */}
            <section style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '24px 28px' }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                  Developer Pro Forma Builder
                </p>
                <p style={{ fontSize: '0.72rem', color: S.textDim }}>
                  Edit any input — IRR, deal signal, and max land price update instantly
                </p>
              </div>

              {pm.human_review_required && (
                <ReviewBanner message="MODEL ESTIMATE — Showing default market assumptions. Replace land price, rent, and construction type with your actual deal inputs before making investment decisions. Not a substitute for licensed contractor bids, appraisal, or lender underwriting." />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'start' }}>

                {/* Left col: inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Inputs
                  </p>

                  <NumInput label="Land Price" value={inputs.landPrice} onChange={v => setInputs(p => ({ ...p, landPrice: v }))} prefix="$" step={25000} />
                  <NumInput label="Units" value={inputs.units} onChange={v => setInputs(p => ({ ...p, units: Math.max(1, v) }))} suffix="units" step={1} min={1} />
                  <NumInput label="Avg Unit Size" value={inputs.avgUnitSf} onChange={v => setInputs(p => ({ ...p, avgUnitSf: Math.max(200, v) }))} suffix="sf" step={50} min={200} />
                  <NumInput label="Rent / Unit / Month" value={inputs.rentPerUnit} onChange={v => setInputs(p => ({ ...p, rentPerUnit: v }))} prefix="$" step={50} min={500} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Construction Type
                    </label>
                    <select
                      value={inputs.constructionType}
                      onChange={e => setInputs(p => ({ ...p, constructionType: e.target.value as CtType }))}
                      style={{
                        background: S.bg3, border: `1px solid ${S.borderDim}`,
                        color: S.text, fontFamily: S.font,
                        padding: '9px 12px', fontSize: '0.8rem', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="Type V">Type V — Wood Frame ≤4 stories (~$275/sf)</option>
                      <option value="Type III">Type III — Concrete 5-7 stories (~$350/sf)</option>
                      <option value="Type I">Type I — High-rise 8+ stories (~$500/sf)</option>
                    </select>
                  </div>

                  {/* Advanced assumptions */}
                  <div style={{ borderTop: `1px solid ${S.borderDim}`, paddingTop: 12, marginTop: 4 }}>
                    <p style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Advanced
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <NumInput label="Vacancy %" value={inputs.vacancyPct} onChange={v => setInputs(p => ({ ...p, vacancyPct: v }))} suffix="%" step={1} min={0} />
                      <NumInput label="Opex %" value={inputs.opexPct} onChange={v => setInputs(p => ({ ...p, opexPct: v }))} suffix="%" step={1} min={0} />
                      <NumInput label="Exit Cap Rate" value={inputs.capRate} onChange={v => setInputs(p => ({ ...p, capRate: v }))} suffix="%" step={0.25} min={2} />
                      <NumInput label="LTC %" value={inputs.ltcPct} onChange={v => setInputs(p => ({ ...p, ltcPct: v }))} suffix="%" step={5} min={0} />
                      <NumInput label="Interest Rate" value={inputs.interestRate} onChange={v => setInputs(p => ({ ...p, interestRate: v }))} suffix="%" step={0.25} min={0} />
                      <NumInput label="Hold Years" value={inputs.holdYears} onChange={v => setInputs(p => ({ ...p, holdYears: Math.max(1, v) }))} suffix="yr" step={1} min={1} />
                    </div>
                  </div>
                </div>

                {/* Right col: computed results */}
                {computed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Results (live)
                    </p>

                    {/* Hero: deal signal + IRR + equity multiple */}
                    <div style={{
                      background: S.bg3, border: `1px solid ${S.borderDim}`,
                      padding: '18px 20px', display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 6 }}>DEAL SIGNAL</p>
                        <DealBadge signal={computed.dealSignal} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 4 }}>LEVERED IRR</p>
                        <p style={{
                          fontSize: '1.65rem', fontWeight: 700, lineHeight: 1,
                          color: computed.irrLevered >= 20 ? '#22c55e'
                            : computed.irrLevered >= 12 ? '#f59e0b'
                            : '#ef4444',
                        }}>
                          {irrLabel(computed.irrLevered)}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 4 }}>EQUITY MULTIPLE</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: S.text }}>
                          {computed.equityMultiple === 0 ? '—' : `${computed.equityMultiple}×`}
                        </p>
                      </div>
                    </div>

                    {/* Max land price highlight */}
                    <div style={{
                      background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)',
                      padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.58rem', color: '#22c55e', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.85 }}>
                          MAX LAND PRICE @ 20% IRR
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>
                          {fmtM(computed.maxLandPrice)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.08em', marginBottom: 4 }}>PER UNIT</p>
                        <p style={{ fontSize: '0.9rem', color: S.textDim }}>
                          {inputs.units > 0 ? fmtM(Math.round(computed.maxLandPrice / inputs.units)) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Cost stack */}
                    <div style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, padding: '14px 18px' }}>
                      <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Cost Stack</p>
                      {[
                        ['Land',              fmtM(inputs.landPrice),    false],
                        ['Hard Costs',        fmtM(computed.hardCosts),  false],
                        ['Soft Costs (20%)',  fmtM(computed.softCosts),  false],
                        ['Total Dev Cost',    fmtM(computed.tdc),        true],
                        ['Cost / Unit',       fmtM(computed.costPerUnit),false],
                      ].map(([lbl, val, bold], i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', marginBottom: 5,
                          ...(i === 2 ? { borderBottom: `1px solid ${S.borderDim}`, paddingBottom: 6 } : {}),
                        }}>
                          <span style={{ fontSize: '0.72rem', color: S.textDim }}>{lbl as string}</span>
                          <span style={{ fontSize: '0.72rem', color: bold ? S.text : S.textDim, fontWeight: bold ? 700 : 400 }}>{val as string}</span>
                        </div>
                      ))}
                    </div>

                    {/* Returns */}
                    <div style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, padding: '14px 18px' }}>
                      <p style={{ fontSize: '0.58rem', color: S.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Returns</p>
                      {[
                        ['NOI (annual)',     fmtM(computed.noi)],
                        ['Exit Value',       fmtM(computed.exitValue)],
                        ['Equity Required',  fmtM(computed.equity)],
                        ['Annual Debt Svc',  fmtM(computed.annualDebt)],
                        ['Unlevered IRR',    irrLabel(computed.irrUnlevered)],
                      ].map(([lbl, val], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: '0.72rem', color: S.textDim }}>{lbl}</span>
                          <span style={{ fontSize: '0.72rem', color: S.text }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Confidence + assumptions */}
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: '0.6rem', color: S.textMuted, letterSpacing: '0.08em' }}>MODEL CONFIDENCE</span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                          color: pm.confidence === 'HIGH' ? '#22c55e'
                            : pm.confidence === 'MEDIUM' ? '#f59e0b'
                            : '#ef4444',
                        }}>
                          {pm.confidence}
                        </span>
                      </div>
                      {pm.assumptions?.map((a, i) => (
                        <p key={i} style={{ fontSize: '0.63rem', color: S.textMuted, lineHeight: 1.55, marginBottom: 2 }}>· {a}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DataBasisNote text={pm.data_basis} />
            </section>

            {/* ── Section 3: Download Report ── */}
            <section style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '28px 28px' }}>
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                  Download Report
                </p>
                <p style={{ fontSize: '0.72rem', color: S.textDim }}>
                  Full PDF with entitlement pathways, developer pro forma, citations, and legal disclaimer — delivered to your email.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
                {REPORT_TIERS.map(tier => {
                  const href = `/checkout?tier=${tier.id}&address=${encodeURIComponent(address)}`;
                  return (
                    <a
                      key={tier.id}
                      href={href}
                      style={{
                        flex: 1, minWidth: 200, maxWidth: 320,
                        background: tier.recommended ? 'rgba(0,212,255,0.04)' : S.bg3,
                        border: `1px solid ${tier.recommended ? S.accent : S.borderDim}`,
                        padding: '20px 22px', textDecoration: 'none', display: 'block',
                        position: 'relative', transition: 'border-color 0.12s',
                      }}
                    >
                      {tier.recommended && (
                        <div style={{
                          position: 'absolute', top: -1, right: 10,
                          background: S.accent, color: S.bg,
                          fontSize: '0.55rem', fontFamily: S.font, fontWeight: 700,
                          letterSpacing: '0.1em', padding: '2px 7px',
                        }}>
                          MOST POPULAR
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tier.recommended ? S.accent : S.text, fontFamily: S.font }}>
                          {tier.label}
                        </span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: tier.recommended ? S.accent : S.text, fontFamily: S.font }}>
                          {tier.price}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: S.textMuted, marginBottom: 14, fontFamily: S.font }}>{tier.desc}</p>
                      <div style={{ borderTop: `1px solid ${S.borderDim}`, paddingTop: 12, marginBottom: 16 }}>
                        {tier.features.map((f, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                            <span style={{ color: tier.recommended ? S.accent : '#22c55e', fontSize: '0.65rem', flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: '0.65rem', color: S.textDim, fontFamily: S.font }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        width: '100%', padding: '9px 0', textAlign: 'center',
                        background: tier.recommended ? S.accent : 'transparent',
                        border: `1px solid ${tier.recommended ? S.accent : S.borderDim}`,
                        color: tier.recommended ? S.bg : S.text,
                        fontSize: '0.72rem', fontFamily: S.font, fontWeight: 700, letterSpacing: '0.1em',
                      }}>
                        GET REPORT →
                      </div>
                    </a>
                  );
                })}
              </div>

              <p style={{ fontSize: '0.62rem', color: S.textMuted, fontFamily: S.font, lineHeight: 1.7 }}>
                Secure checkout via Stripe · Report generated and emailed within 60 seconds · One-time payment, no subscription ·{' '}
                Questions? <a href="mailto:support@sevennova.ai" style={{ color: S.accent, textDecoration: 'none' }}>support@sevennova.ai</a>
              </p>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}

export default function ZoningReportPage() {
  return (
    <Suspense fallback={
      <div style={{
        background: '#04080f', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Mono', monospace", color: '#94a3b8', fontSize: '0.8rem',
      }}>
        LOADING...
      </div>
    }>
      <ZoningReportInner />
    </Suspense>
  );
}
