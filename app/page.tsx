'use client';
// v3 — 2026-05-04

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SKILLS = [
  { id: 'la-developer-intelligence',  label: 'LA Developer Intel',    desc: 'Zoning codes, FAR, height limits, TOC tiers' },
  { id: 'distressed-debt-radar',      label: 'Distressed Debt Radar', desc: 'DSCR, loan maturity, NOD/lis pendens signals' },
  { id: 'ensemble-pricing-engine',    label: 'Ensemble Pricing',      desc: 'XGBoost + LightGBM + CatBoost valuation' },
  { id: 'ladbs-violation-scanner',    label: 'LADBS Scanner',         desc: 'Active violations, substandard orders' },
  { id: 'climate-risk-engine',        label: 'Climate Risk Engine',   desc: 'Flood, fire, heat, seismic, insurance stress' },
  { id: 'entitlement-pathways',       label: 'Entitlement Pathways',  desc: 'ED1, AB2011, TOC approval probability' },
  { id: 'rso-compliance-checker',     label: 'RSO Compliance',        desc: 'Rent stabilization, unit count discrepancy' },
  { id: 'legal-entity-graph',         label: 'Legal Entity Graph',    desc: 'Ownership chains, LLC dissolution signals' },
  { id: 'market-comparables',         label: 'Market Comparables',    desc: 'Neighborhood rent trends, cap rates' },
  { id: 'permit-history-analyzer',    label: 'Permit History',        desc: 'Unpermitted additions, code compliance' },
  { id: 'opportunity-zone-detector',  label: 'OZ Detector',          desc: 'Federal OZ eligibility, tax benefit pathways' },
  { id: 'carry-cost-calculator',      label: 'Carry Cost Calc',       desc: 'Monthly holding costs, IRR projections' },
  { id: 'title-lien-scanner',         label: 'Title & Lien Scanner',  desc: 'Mechanics liens, tax liens, encumbrances' },
  { id: 'seismic-retrofit-checker',   label: 'Seismic Retrofit',      desc: 'Soft-story mandates, retrofit costs' },
  { id: 'investment-thesis-writer',   label: 'Investment Thesis',     desc: 'AI-generated narrative with source citations' },
];

const PRICING_PREVIEW = [
  { tier: 'basic',       label: 'Basic',       price: '$49',  desc: 'Zoning + Violations + Valuation' },
  { tier: 'full',        label: 'Full',        price: '$199', desc: 'All 15 skills, full report', featured: true },
  { tier: 'institutional', label: 'Institutional', price: '$499', desc: 'Full + Comparables + Expert review' },
];

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [tier, setTier] = useState('full');

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    const params = new URLSearchParams({ address, zip, tier });
    router.push(`/analyze?${params.toString()}`);
  };

  return (
    <div style={{ background: '#04080f', minHeight: '100vh', fontFamily: "'Space Mono', monospace", color: '#e8f0fe' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(4,8,15,0.95)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em' }}>
            SEVEN<span style={{ color: '#e8f0fe' }}>NOVA</span><span style={{ color: '#00d4ff', opacity: 0.5 }}>.ai</span>
          </span>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/pricing" style={{ color: '#94a3b8', fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>PRICING</Link>
            <Link href="/analyze" style={{ color: '#94a3b8', fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>ANALYZE</Link>
            <Link href="/pricing" style={{
              background: '#00d4ff', color: '#04080f',
              fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.08em', padding: '6px 16px',
              textDecoration: 'none',
            }}>
              GET REPORT
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 24px 64px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(0,212,255,0.1)',
          border: '1px solid rgba(0,212,255,0.2)',
          color: '#00d4ff',
          fontSize: '0.65rem', letterSpacing: '0.14em',
          padding: '4px 12px', marginBottom: 28,
        }}>
          15 AI SKILLS · &lt;60s LATENCY · INSTITUTIONAL GRADE
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 20,
        }}>
          Real Estate Intelligence<br />
          <span style={{ color: '#00d4ff' }}>That Moves First.</span>
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: 580, margin: '0 auto 48px', lineHeight: 1.75 }}>
          Address in. Full institutional report out in under 60 seconds. Zoning, valuation,
          distress signals, entitlement pathways, and climate risk — all in one document.
        </p>

        {/* Address Form */}
        <form onSubmit={handleAnalyze} style={{
          background: '#070d18',
          border: '1px solid rgba(0,212,255,0.15)',
          padding: '28px 32px',
          maxWidth: 700, margin: '0 auto',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="3612 W Jefferson Blvd"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              style={{
                background: '#0a1220', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e8f0fe', fontFamily: "'Space Mono', monospace",
                padding: '12px 16px', fontSize: '0.88rem', outline: 'none',
                width: '100%',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#00d4ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <input
              type="text"
              placeholder="ZIP"
              value={zip}
              onChange={e => setZip(e.target.value)}
              maxLength={5}
              style={{
                background: '#0a1220', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e8f0fe', fontFamily: "'Space Mono', monospace",
                padding: '12px 10px', fontSize: '0.88rem', outline: 'none',
                textAlign: 'center',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#00d4ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Tier selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {PRICING_PREVIEW.map(p => (
              <button
                key={p.tier}
                type="button"
                onClick={() => setTier(p.tier)}
                style={{
                  flex: 1, padding: '8px 12px',
                  fontSize: '0.72rem', fontFamily: "'Space Mono', monospace",
                  fontWeight: tier === p.tier ? 700 : 400,
                  background: tier === p.tier ? 'rgba(0,212,255,0.12)' : 'transparent',
                  border: tier === p.tier ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.06)',
                  color: tier === p.tier ? '#00d4ff' : '#94a3b8',
                  cursor: 'pointer', minWidth: 100,
                  transition: 'all 0.12s',
                }}
              >
                {p.label} — {p.price}
              </button>
            ))}
          </div>

          <button
            type="submit"
            style={{
              width: '100%', padding: '14px',
              background: '#00d4ff', color: '#04080f',
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700, fontSize: '0.85rem',
              letterSpacing: '0.1em', border: 'none', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#22e5ff')}
            onMouseLeave={e => (e.currentTarget.style.background = '#00d4ff')}
          >
            ANALYZE PROPERTY →
          </button>
        </form>

        <p style={{ color: '#5a7090', fontSize: '0.7rem', marginTop: 14, letterSpacing: '0.04em' }}>
          City of Los Angeles · All 35 ZIP codes · LADBS + Assessor + MLS data
        </p>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
          {[
            { val: '15',   label: 'AI Skills' },
            { val: '<60s', label: 'Report Time' },
            { val: '$49',  label: 'Starting Price' },
            { val: '100%', label: 'LA Coverage' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#00d4ff', letterSpacing: '-0.02em' }}>{s.val}</div>
              <div style={{ fontSize: '0.65rem', color: '#5a7090', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      <section style={{ padding: '64px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: '#5a7090', textTransform: 'uppercase', marginBottom: 10 }}>Platform</p>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
            15 Specialized AI Skills
          </h2>
          <div style={{ width: 40, height: 1, background: '#00d4ff', margin: '14px auto 0' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 1,
          background: 'rgba(255,255,255,0.04)',
        }}>
          {SKILLS.map((skill, i) => (
            <div
              key={skill.id}
              style={{ background: '#070d18', padding: '20px', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1220')}
              onMouseLeave={e => (e.currentTarget.style.background = '#070d18')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  width: 22, height: 22, flexShrink: 0,
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', color: '#00d4ff', fontWeight: 700,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em', color: '#e8f0fe' }}>
                  {skill.label}
                </span>
              </div>
              <p style={{ fontSize: '0.7rem', color: '#5a7090', lineHeight: 1.6, margin: 0 }}>
                {skill.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section style={{ padding: '0 24px 80px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: '#5a7090', textTransform: 'uppercase', marginBottom: 10 }}>Pricing</p>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
            One-Time Reports
          </h2>
          <div style={{ width: 40, height: 1, background: '#00d4ff', margin: '14px auto 0' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
          {PRICING_PREVIEW.map(p => (
            <div key={p.tier} style={{
              background: p.featured ? '#0a1220' : '#070d18',
              padding: '32px 24px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {p.featured && (
                <div style={{
                  position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
                  color: '#00d4ff', fontSize: '0.6rem', letterSpacing: '0.12em',
                  padding: '2px 10px', whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ paddingTop: p.featured ? 24 : 0 }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: '#5a7090', textTransform: 'uppercase', marginBottom: 12 }}>
                  {p.label}
                </p>
                <p style={{ fontSize: '2.4rem', fontWeight: 700, color: p.featured ? '#00d4ff' : '#e8f0fe', marginBottom: 8 }}>
                  {p.price}
                </p>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 24, lineHeight: 1.5 }}>
                  {p.desc}
                </p>
                <Link
                  href={`/checkout?tier=${p.tier}`}
                  style={{
                    display: 'block', padding: '10px',
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    textDecoration: 'none',
                    background: p.featured ? '#00d4ff' : 'transparent',
                    color: p.featured ? '#04080f' : '#00d4ff',
                    border: p.featured ? 'none' : '1px solid rgba(0,212,255,0.25)',
                  }}
                >
                  GET STARTED →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/pricing" style={{ color: '#00d4ff', fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
            View all plans including subscriptions →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px', textAlign: 'center', marginTop: 'auto' }}>
        <p style={{ color: '#5a7090', fontSize: '0.7rem', lineHeight: 2 }}>
          <span style={{ color: '#00d4ff', fontWeight: 700 }}>SEVENNOVA.ai</span>
          {' · '}
          <Link href="/pricing" style={{ color: '#5a7090', textDecoration: 'none' }}>Pricing</Link>
          {' · '}
          <Link href="/analyze" style={{ color: '#5a7090', textDecoration: 'none' }}>Analyze</Link>
          <br />
          For informational purposes only. Not a licensed appraisal or investment advice.
          <br />
          © 2026 SevenNova.ai — All rights reserved.
        </p>
      </footer>
    </div>
  );
}
