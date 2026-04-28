'use client'
import { useState } from 'react'

const NAV_LINKS = ['Features', 'Zoning AI', 'Market Intel', 'For Agents', 'Pricing']

const FEATURES = [
  {
    icon: '🏠',
    title: 'Residential Intelligence',
    desc: 'AI-powered valuations, neighborhood analysis, and predictive pricing for every residential property in America.',
  },
  {
    icon: '🏢',
    title: 'Commercial Analytics',
    desc: 'LoopNet-level listings with AI underwriting, cap rate modeling, and NOI forecasting built in.',
  },
  {
    icon: '🗺️',
    title: 'Zoning AI',
    desc: 'Instant zoning analysis for any US address. Permitted uses, FAR limits, setbacks, overlay zones — in seconds.',
  },
  {
    icon: '📊',
    title: 'Market Predictions',
    desc: 'Quantitative models trained on 50M+ transactions. Know where the market is going before anyone else.',
  },
  {
    icon: '🤖',
    title: 'AI Property Agent',
    desc: 'Ask anything about any property. Our AI agent reads permits, violations, zoning, comparables, and ownership history instantly.',
  },
  {
    icon: '⚖️',
    title: 'Compliance & Violations',
    desc: 'LADBS, city enforcement, and permit records surfaced before you close. Never buy a problem property again.',
  },
]

const STATS = [
  { val: '150M+', label: 'Properties Indexed' },
  { val: '3,200+', label: 'Zoning Codes' },
  { val: '<2s', label: 'AI Response Time' },
  { val: '99.9%', label: 'Uptime SLA' },
]

export default function Home() {
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f5a623')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >{l}</a>
          ))}
          <button style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
            Get Early Access
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '120px 40px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: '#f5a623', marginBottom: '32px' }}>
          Next Generation Real Estate Intelligence
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: '24px' }}>
          The AI That Knows<br />
          <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Every Property in America
          </span>
        </h1>
        <p style={{ fontSize: '20px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 48px' }}>
          Zillow meets GPT-4. Search, analyze, and invest in real estate with AI that reads permits, zoning codes, violations, and market data — instantly.
        </p>

        {/* SEARCH BAR */}
        <div style={{ display: 'flex', gap: '12px', maxWidth: '600px', margin: '0 auto 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px 8px 8px 20px', alignItems: 'center' }}>
          <span style={{ fontSize: '20px' }}>🔍</span>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && address && (window.location.href = `/property?address=${encodeURIComponent(address)}`)}
            placeholder="Enter any US address, parcel, or zip code..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '16px', fontFamily: 'inherit' }}
          />
          <button
            onClick={() => address && (window.location.href = `/property?address=${encodeURIComponent(address)}`)}
            style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Analyze with AI →
          </button>
        </div>
        <p style={{ fontSize: '13px', color: '#475569' }}>Try: "3612 W Jefferson Blvd Los Angeles" or "90210" or "commercial lots in Beverly Hills"</p>
      </section>

      {/* STATS */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '40px', display: 'flex', justifyContent: 'center', gap: '80px', flexWrap: 'wrap' }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 900, background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.val}</div>
            <div style={{ fontSize: '13px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ color: '#f5a623', fontSize: '12px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Platform Features</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1px' }}>Built for the Next Generation<br />of Real Estate</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,166,35,0.4)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#f1f5f9' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ZONING AI SECTION */}
      <section id="zoning-ai" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '100px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#f5a623', fontSize: '12px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Zoning Intelligence</p>
            <h2 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '24px', lineHeight: 1.2 }}>Know What You Can Build Before You Buy</h2>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.8, marginBottom: '32px' }}>Our AI reads 3,200+ municipal zoning codes so you don't have to. Get instant answers on permitted uses, density limits, ADU potential, and development opportunities for any parcel.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {['Permitted uses by right', 'FAR and height limits', 'Setback requirements', 'ADU / development potential', 'Overlay zone analysis', 'Active permit & violation flags'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#94a3b8' }}>
                  <span style={{ color: '#f5a623', fontSize: '16px' }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 0 60px rgba(245,166,35,0.08)' }}>
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', letterSpacing: '2px' }}>AI ZONING REPORT</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f5a623', marginBottom: '24px' }}>3612 W Jefferson Blvd, Los Angeles</div>
            {[
              ['Zone', 'C2-1 (Commercial)'],
              ['Permitted Uses', 'Retail, Office, Mixed-Use'],
              ['Max FAR', '1.5x Lot Area'],
              ['Height Limit', '45 ft / 3 stories'],
              ['ADU Eligible', '✓ Yes — up to 1,200 sqft'],
              ['Active Violations', '⚠ LADBS Case #1074040'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ color: v.toString().includes('⚠') ? '#ef4444' : '#e2e8f0', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <button style={{ width: '100%', marginTop: '24px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Run Full AI Analysis →
            </button>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '100px 40px', textAlign: 'center' }}>
        <p style={{ color: '#f5a623', fontSize: '12px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Early Access</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px' }}>Be First on the Platform</h2>
        <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '40px' }}>Join the waitlist. First 500 members get lifetime founding member pricing.</p>
        {submitted ? (
          <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '12px', padding: '24px', color: '#f5a623', fontWeight: 700, fontSize: '18px' }}>
            ✓ You're on the list. We'll be in touch.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px 8px 8px 20px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '16px', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => email && setSubmitted(true)}
              style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Join Waitlist →
            </button>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '12px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </div>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai — All rights reserved. | The Issak Group</p>
        <p style={{ color: '#334155', fontSize: '12px', marginTop: '8px' }}>Next-Generation AI Real Estate Intelligence Platform</p>
      </footer>

    </div>
  )
}
