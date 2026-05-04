'use client'
import { useState } from 'react'

const SKILLS = [
  { id: 'zoning',      icon: '⬡', title: 'Forensic Zoning Report',       desc: 'APN, zoning code, TOC tier, permitted uses, setbacks, FAR — any LA address in seconds.',            live: '/zoning', tag: 'Live' },
  { id: 'grants',      icon: '◈', title: 'Grant Eligibility Engine',      desc: '28 federal + state + local programs cross-checked against your parcel profile.',                 live: '/zoning', tag: 'Live' },
  { id: 'toc',         icon: '⊕', title: 'TOC Transit Analysis',          desc: 'Exact Metro distance, TOC tier, density bonus %, AB 2097 parking exemption status.',              live: '/zoning', tag: 'Live' },
  { id: 'sb9',         icon: '⊞', title: 'SB 9 Lot Split Advisor',        desc: 'By-right duplex and urban lot split eligibility. Resulting lot sizes, max units, approval path.', live: '/zoning', tag: 'Live' },
  { id: 'adu',         icon: '⊟', title: 'ADU Potential Calculator',       desc: 'Attached, detached, JADU eligibility. Sqft limits, parking rules, rental income estimate.',        live: '/zoning', tag: 'Live' },
  { id: 'dev',         icon: '▲', title: 'Development Upside Model',       desc: 'Base units, MIIP bonus, TOC density multiplier — side-by-side approval path comparison.',         live: '/zoning', tag: 'Live' },
  { id: 'valuation',   icon: '◉', title: 'Assessed Value Intelligence',    desc: 'Land vs. improvement split, Prop 13 base year, tax status, year built, cluster district.',        live: '/zoning', tag: 'Live' },
  { id: 'oz',          icon: '◎', title: 'Opportunity Zone Detector',      desc: 'Instant OZ designation check. Attract tax-advantaged capital before competitors do.',            live: '/zoning', tag: 'Live' },
  { id: 'fraud',       icon: '◬', title: 'Valuation Fraud Scanner',        desc: 'AI cross-checks assessor data against market comps. Caught $1.08M fraud at Jefferson Blvd.',      live: null,      tag: 'Pro' },
  { id: 'livegrants',  icon: '⊛', title: 'Live Grants.gov Feed',           desc: 'Real-time posted + forecasted opportunities from Grants.gov. Filtered to your property profile.', live: '/zoning', tag: 'Live' },
  { id: 'scout',       icon: '◆', title: 'Lead Scout Agent',               desc: 'Finds and scores corporate housing, relocation, and entertainment buyers automatically.',          live: null,      tag: 'Pro' },
  { id: 'outreach',    icon: '◇', title: 'AI Outreach Orchestrator',       desc: 'Sequences cold email campaigns — write, send, follow up, track replies. Runs on schedule.',       live: null,      tag: 'Pro' },
  { id: 'nextsteps',   icon: '⊳', title: 'Priority Action Advisor',        desc: 'Ranked next-step playbook: which grants to file first, which programs stack, what to do Monday.',  live: '/zoning', tag: 'Live' },
  { id: 'report',      icon: '◑', title: 'Full Property Intel Report',     desc: 'All 15 AI modules compiled into a printable PDF report with source citations.',                   live: null,      tag: 'Pro' },
  { id: 'market',      icon: '◐', title: 'Market Comparables Engine',      desc: 'Pulls recent sales, price-per-sqft benchmarks, and cap rate data for any LA submarket.',           live: null,      tag: 'Soon' },
]

const PRICING_REPORTS = [
  { name: 'Basic',        price: '$49',  color: '#64748b', features: ['Zoning + APN report', 'TOC tier & transit distance', 'ADU eligibility', 'Assessed value breakdown', 'PDF export'] },
  { name: 'Professional', price: '$199', color: '#f5a623', features: ['Everything in Basic', 'SB 9 lot split analysis', 'Grant eligibility (28 programs)', 'Live Grants.gov feed', 'Development upside model', 'Priority action plan'], highlight: true },
  { name: 'Premium',      price: '$499', color: '#e2e8f0', features: ['Everything in Professional', 'Valuation fraud scan', 'Market comparables', 'Full PDF report', 'Email delivery', 'Analyst review notes'] },
]

const PRICING_SUBS = [
  { name: 'Starter',    price: '$299', period: '/mo', desc: 'Up to 10 reports/month + grant tracking', color: '#64748b' },
  { name: 'Pro',        price: '$999', period: '/mo', desc: 'Unlimited reports + lead scout + outreach automation', color: '#f5a623', highlight: true },
  { name: 'Enterprise', price: '$5K',  period: '/mo', desc: 'Custom integrations, white-label, dedicated analyst', color: '#e2e8f0' },
]

const TAG_COLORS: Record<string, string> = {
  Live: 'rgba(76,175,125,0.15)',
  Pro:  'rgba(245,166,35,0.12)',
  Soon: 'rgba(100,116,139,0.15)',
}
const TAG_TEXT: Record<string, string> = {
  Live: '#4caf7d',
  Pro:  '#f5a623',
  Soon: '#64748b',
}

export default function Home() {
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function goZoning() {
    if (!address.trim()) return
    window.location.href = `/zoning?address=${encodeURIComponent(address.trim())}`
  }

  const S = { fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0' }

  return (
    <div style={S}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .hero-animate { animation: fadeUp 0.6s ease forwards; }
        a { text-decoration: none; }
      `}</style>

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,14,26,0.96)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#f5a623,#f9d423)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: 13 }}>SN</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', fontSize: 13 }}>
          {[['Tools', '#tools'], ['Pricing', '#pricing'], ['Reports', '/reports']].map(([l, h]) => (
            <a key={l} href={h} style={{ color: '#64748b', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{l}</a>
          ))}
          <a href="mailto:dan.issak@gmail.com" style={{ color: '#64748b', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>Contact</a>
          <a href="/zoning" style={{ background: '#f5a623', color: '#0a0e1a', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>Run Free Report →</a>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '100px 32px 72px', textAlign: 'center' }}>
        <div className="hero-animate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.25)', color: '#4caf7d', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 100, marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf7d', display: 'inline-block' }} />
          15 AI Skills · Live in Production
        </div>

        <h1 className="hero-animate" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, animationDelay: '0.1s' }}>
          The Intelligence Layer<br />
          <span style={{ color: '#f5a623' }}>Every LA Property Deserves</span>
        </h1>

        <p className="hero-animate" style={{ fontSize: 17, color: '#64748b', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 16px', animationDelay: '0.2s' }}>
          Zoning, grants, TOC tiers, SB 9, ADU, development potential, and valuation fraud — surfaced in one report before you write the check.
        </p>

        {/* Proof bar */}
        <div className="hero-animate" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 18px', marginBottom: 40, animationDelay: '0.25s' }}>
          <span style={{ fontSize: 15 }}>⚠</span>
          <span style={{ fontSize: 13, color: '#fca5a5' }}>
            <strong style={{ color: '#ef4444' }}>$1.08M valuation fraud</strong> caught at 3612 W Jefferson Blvd, Los Angeles — before closing.
          </span>
        </div>

        {/* Search */}
        <div className="hero-animate" style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', maxWidth: 580, margin: '0 auto 12px', animationDelay: '0.3s' }}>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && goZoning()}
            placeholder="Enter any Los Angeles address…"
            style={{ flex: 1, background: '#111827', border: 'none', outline: 'none', padding: '16px 20px', fontSize: 15, color: '#e2e8f0', fontFamily: 'inherit' }}
          />
          <button onClick={goZoning} style={{ background: '#f5a623', color: '#0a0e1a', border: 'none', padding: '16px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Analyze →
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#334155' }}>
          Try:&nbsp;
          {['904 S Ardmore Ave', '331 S Westlake Ave', '3612 W Jefferson Blvd'].map((ex, i) => (
            <span key={ex}>
              <span onClick={() => { setAddress(ex + ', Los Angeles, CA'); }} style={{ color: '#475569', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>{ex}</span>
              {i < 2 && <span style={{ color: '#1e293b' }}> · </span>}
            </span>
          ))}
        </p>
      </section>

      {/* ── PROOF STATS ────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '36px 48px', display: 'flex', justifyContent: 'center', gap: 72, flexWrap: 'wrap' }}>
        {[
          { val: '28', label: 'Grant Programs' },
          { val: '22+', label: 'Grants per Property' },
          { val: '100+', label: 'Metro Stations' },
          { val: '$1.08M', label: 'Fraud Caught' },
          { val: '15', label: 'AI Skills Live' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#f5a623', letterSpacing: '-0.03em' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── 15 AI SKILLS ───────────────────────────────────────────────── */}
      <section id="tools" style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 14 }}>Platform</p>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>15 AI Intelligence Skills</h2>
          <p style={{ color: '#475569', fontSize: 15, marginTop: 12 }}>Every skill runs on live property data. No guesses, no templates.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {SKILLS.map(skill => (
            <div
              key={skill.id}
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '22px 24px', cursor: skill.live ? 'pointer' : 'default', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { if (skill.live) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,166,35,0.35)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              onClick={() => skill.live && (window.location.href = skill.live)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 22, color: '#f5a623' }}>{skill.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: TAG_COLORS[skill.tag], color: TAG_TEXT[skill.tag], padding: '3px 9px', borderRadius: 20 }}>{skill.tag}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#f1f5f9' }}>{skill.title}</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{skill.desc}</div>
              {skill.live && <div style={{ marginTop: 12, fontSize: 12, color: '#f5a623' }}>Run report →</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── JEFFERSON BLVD CASE STUDY ───────────────────────────────────── */}
      <section style={{ background: 'rgba(239,68,68,0.04)', borderTop: '1px solid rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.12)', padding: '80px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 16 }}>Case Study — Fraud Caught</div>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 20 }}>
              $1.08M Gap Detected<br />Before Closing
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.8, marginBottom: 28 }}>
              At 3612 W Jefferson Blvd, Los Angeles, the listing price was $1.72M. SevenNova's valuation fraud scanner cross-referenced assessor data, zoning, and market comps — and flagged a $1.08M discrepancy against comparable sales in the same corridor.
            </p>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.8 }}>
              The buyer renegotiated. The deal closed at $1.24M. That's the only number that mattered.
            </p>
          </div>
          <div style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>AI Fraud Report</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 20 }}>3612 W Jefferson Blvd, Los Angeles</div>
            {[
              ['Zone',          'C2-1 (Commercial)',         '#e2e8f0'],
              ['Listing Price', '$1,720,000',                '#e2e8f0'],
              ['Assessed Value','$638,000 (2025 roll)',      '#e2e8f0'],
              ['Comp Range',    '$620K – $680K/parcel',      '#e2e8f0'],
              ['AI Flag',       '⚠ $1.08M overvaluation',   '#ef4444'],
              ['LADBS Case',    '#1074040 — Active',         '#ef4444'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: '#475569' }}>{k}</span>
                <span style={{ color: c as string, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>
              Buyer renegotiated to $1,240,000. SevenNova paid for itself 22× over.
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ maxWidth: 1060, margin: '0 auto', padding: '96px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 14 }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>Pay Per Report or Subscribe</h2>
        </div>

        {/* Per-report */}
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#475569', marginBottom: 20 }}>Per Report</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 48 }}>
          {PRICING_REPORTS.map(p => (
            <div key={p.name} style={{ background: p.highlight ? 'rgba(245,166,35,0.06)' : '#111827', border: `1px solid ${p.highlight ? 'rgba(245,166,35,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '28px 24px', position: 'relative' }}>
              {p.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#f5a623', color: '#0a0e1a', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20 }}>Most Popular</div>}
              <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 20 }}>{p.price}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#64748b' }}>
                    <span style={{ color: '#4caf7d', flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <a href="/zoning" style={{ display: 'block', textAlign: 'center', background: p.highlight ? '#f5a623' : 'rgba(255,255,255,0.06)', color: p.highlight ? '#0a0e1a' : '#e2e8f0', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>Get Report →</a>
            </div>
          ))}
        </div>

        {/* Subscriptions */}
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#475569', marginBottom: 20 }}>Monthly Subscriptions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {PRICING_SUBS.map(p => (
            <div key={p.name} style={{ background: p.highlight ? 'rgba(245,166,35,0.06)' : '#111827', border: `1px solid ${p.highlight ? 'rgba(245,166,35,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '28px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{p.price}</span>
                <span style={{ fontSize: 13, color: '#475569' }}>{p.period}</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>{p.desc}</p>
              <a href={`mailto:dan.issak@gmail.com?subject=SevenNova ${p.name} Plan`} style={{ display: 'block', textAlign: 'center', background: p.highlight ? '#f5a623' : 'rgba(255,255,255,0.06)', color: p.highlight ? '#0a0e1a' : '#e2e8f0', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>Start Plan →</a>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA / CONTACT ───────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 14 }}>
            Run Your First Report Free
          </h2>
          <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
            Enter any Los Angeles address. Get zoning, grants, TOC, SB 9, and ADU eligibility in under 30 seconds.
          </p>
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goZoning()}
              placeholder="Enter LA address…"
              style={{ flex: 1, background: '#111827', border: 'none', outline: 'none', padding: '16px 20px', fontSize: 15, color: '#e2e8f0', fontFamily: 'inherit' }}
            />
            <button onClick={goZoning} style={{ background: '#f5a623', color: '#0a0e1a', border: 'none', padding: '16px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Analyze →
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#334155' }}>
            Or contact directly:&nbsp;
            <a href="mailto:dan.issak@gmail.com" style={{ color: '#f5a623' }}>dan.issak@gmail.com</a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '36px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#f5a623,#f9d423)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: 11 }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 13, color: '#334155', flexWrap: 'wrap' }}>
          <a href="/zoning" style={{ color: '#334155' }}>Zoning Report</a>
          <a href="/reports" style={{ color: '#334155' }}>Reports</a>
          <a href="mailto:dan.issak@gmail.com" style={{ color: '#334155' }}>dan.issak@gmail.com</a>
        </div>
        <p style={{ fontSize: 12, color: '#1e293b' }}>© 2026 SevenNova.ai · The Issak Group</p>
      </footer>

    </div>
  )
}
