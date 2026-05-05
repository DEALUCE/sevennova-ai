'use client';

import Link from 'next/link';

const S = {
  bg: '#04080f',
  bg2: '#070d18',
  bg3: '#0a1220',
  accent: '#00d4ff',
  text: '#e8f0fe',
  textDim: '#94a3b8',
  textMuted: '#5a7090',
  border: 'rgba(0,212,255,0.12)',
  borderDim: 'rgba(255,255,255,0.06)',
  font: "'Space Mono', monospace",
};

const REPORTS = [
  {
    tier: 'basic',
    label: 'Basic',
    price: '$49',
    desc: 'Essential analysis for quick deal screening.',
    features: [
      'Zoning code + APN lookup',
      'TOC tier & transit distance',
      'LADBS violation check',
      'Assessed value + Prop 13',
      'ADU eligibility',
      'PDF export',
    ],
  },
  {
    tier: 'full',
    label: 'Full',
    price: '$199',
    desc: 'Complete institutional analysis. The product.',
    features: [
      'Everything in Basic',
      'All 15 AI skills',
      'Ensemble valuation model',
      'Distress score + DSCR estimate',
      'Entitlement pathway analysis',
      'Climate risk + insurance stress',
      'Investment thesis + deal score',
      'Strategic recommendations',
    ],
    featured: true,
  },
  {
    tier: 'institutional',
    label: 'Institutional',
    price: '$499',
    desc: 'For fund managers and repeat investors.',
    features: [
      'Everything in Full',
      'Market comparables (5 pulls)',
      'Legal entity ownership graph',
      'Title + lien scan',
      'Seismic retrofit assessment',
      'Analyst review notes',
      'Priority email delivery',
    ],
  },
];

const SUBSCRIPTIONS = [
  {
    id: 'broker',
    label: 'Broker',
    price: '$299',
    per: '/mo',
    desc: '10 Full reports per month. Built for active deal flow.',
    features: [
      '10 Full reports/month',
      'Priority queue (&lt;30s)',
      'Report history dashboard',
      'CSV export',
    ],
  },
  {
    id: 'investor',
    label: 'Investor',
    price: '$999',
    per: '/mo',
    desc: 'Unlimited reports. For funds and serious investors.',
    features: [
      'Unlimited reports',
      'API access',
      'Webhook delivery',
      'Team seats (3)',
      'Custom report branding',
    ],
    featured: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: '$5K',
    per: '/mo',
    desc: 'White-label, custom integrations, dedicated analyst.',
    features: [
      'Unlimited reports',
      'White-label output',
      'CRM integration',
      'Dedicated analyst',
      'SLA guarantee',
      'Custom data feeds',
    ],
  },
];

function Check() {
  return <span style={{ color: '#00ff88', marginRight: 8, fontWeight: 700 }}>+</span>;
}

export default function PricingPage() {
  return (
    <div style={{ background: S.bg, minHeight: '100vh', fontFamily: S.font, color: S.text }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${S.borderDim}`, background: 'rgba(4,8,15,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ color: S.accent, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em', textDecoration: 'none' }}>
            SEVEN<span style={{ color: S.text }}>NOVA</span><span style={{ color: S.accent, opacity: 0.5 }}>.ai</span>
          </Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/analyze" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>ANALYZE</Link>
            <Link href="/" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>HOME</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 14 }}>Pricing</p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Pay Per Report.<br /><span style={{ color: S.accent }}>Or Subscribe.</span>
          </h1>
          <p style={{ color: S.textDim, fontSize: '0.9rem', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Institutional-grade intelligence from $49. No subscriptions required to get started.
          </p>
        </div>

        {/* One-time reports */}
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 20 }}>
          — One-Time Reports
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: S.borderDim, marginBottom: 64 }}>
          {REPORTS.map(r => (
            <div key={r.tier} style={{
              background: r.featured ? S.bg3 : S.bg2,
              padding: '36px 28px',
              position: 'relative',
            }}>
              {r.featured && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  background: S.accent, color: S.bg,
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
                  textAlign: 'center', padding: '5px',
                }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ paddingTop: r.featured ? 20 : 0 }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>
                  {r.label}
                </p>
                <p style={{ fontSize: '2.8rem', fontWeight: 700, color: r.featured ? S.accent : S.text, marginBottom: 4, lineHeight: 1 }}>
                  {r.price}
                </p>
                <p style={{ fontSize: '0.72rem', color: S.textMuted, marginBottom: 28, lineHeight: 1.5 }}>
                  {r.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {r.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'baseline', fontSize: '0.75rem', color: S.textDim, lineHeight: 1.4 }}>
                      <Check />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/checkout?tier=${r.tier}`}
                  style={{
                    display: 'block', textAlign: 'center', padding: '12px',
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
                    textDecoration: 'none',
                    background: r.featured ? S.accent : 'transparent',
                    color: r.featured ? S.bg : S.accent,
                    border: r.featured ? 'none' : `1px solid ${S.border}`,
                    transition: 'all 0.12s',
                  }}
                >
                  BUY REPORT →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Subscriptions */}
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 20 }}>
          — Monthly Subscriptions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: S.borderDim }}>
          {SUBSCRIPTIONS.map(s => (
            <div key={s.id} style={{
              background: s.featured ? S.bg3 : S.bg2,
              padding: '36px 28px',
              position: 'relative',
            }}>
              {s.featured && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  background: S.accent, color: S.bg,
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
                  textAlign: 'center', padding: '5px',
                }}>
                  RECOMMENDED
                </div>
              )}
              <div style={{ paddingTop: s.featured ? 20 : 0 }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>
                  {s.label}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 700, color: s.featured ? S.accent : S.text, lineHeight: 1 }}>
                    {s.price}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: S.textMuted }}>{s.per}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: S.textMuted, marginBottom: 28, lineHeight: 1.5 }}>
                  {s.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {s.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'baseline', fontSize: '0.75rem', color: S.textDim, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: `<span style="color:#00ff88;font-weight:700;margin-right:8px">+</span>${f}` }} />
                  ))}
                </div>
                <Link
                  href={`/checkout?tier=${s.id}&type=subscription`}
                  style={{
                    display: 'block', textAlign: 'center', padding: '12px',
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
                    textDecoration: 'none',
                    background: s.featured ? S.accent : 'transparent',
                    color: s.featured ? S.bg : S.accent,
                    border: s.featured ? 'none' : `1px solid ${S.border}`,
                  }}
                >
                  START PLAN →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ note */}
        <div style={{ marginTop: 48, background: S.bg2, border: `1px solid ${S.borderDim}`, padding: '24px 28px' }}>
          <p style={{ fontSize: '0.75rem', color: S.textDim, lineHeight: 1.8 }}>
            <span style={{ color: S.accent, fontWeight: 700 }}>All reports</span> are for informational purposes only and do not constitute a licensed appraisal, legal advice, or investment recommendation.
            Reports are generated using AI analysis of public data sources including LADBS, LA County Assessor, and MLS.
            Confidence scores are provided for all data points.
            {' '}
            <Link href="/analyze" style={{ color: S.accent, textDecoration: 'none' }}>Try the free demo →</Link>
          </p>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${S.borderDim}`, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ color: S.textMuted, fontSize: '0.7rem', lineHeight: 2 }}>
          <span style={{ color: S.accent, fontWeight: 700 }}>SEVENNOVA.ai</span>
          {' · '}
          <Link href="/" style={{ color: S.textMuted, textDecoration: 'none' }}>Home</Link>
          {' · '}
          <Link href="/analyze" style={{ color: S.textMuted, textDecoration: 'none' }}>Analyze</Link>
          <br />
          © 2026 SevenNova.ai — All rights reserved.
        </p>
      </footer>
    </div>
  );
}
