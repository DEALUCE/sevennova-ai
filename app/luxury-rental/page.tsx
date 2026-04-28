'use client'
import { useState } from 'react'

const AMENITIES = [
  { icon: '🏊', label: 'Heated Pool & Spa', sub: 'Gas-heated, filtered' },
  { icon: '🧖', label: 'Steam Sauna', sub: 'Primary suite' },
  { icon: '👨‍🍳', label: "Chef's Kitchen", sub: 'Dual ovens & sinks' },
  { icon: '🏠', label: 'Guest House', sub: '~400 sq ft ADU' },
  { icon: '⚡', label: 'EV Charging', sub: 'On-site station' },
  { icon: '🔒', label: 'Gated Security', sub: 'Ring + auto gate' },
  { icon: '🌐', label: 'Smart Home', sub: 'Multi-zone HVAC + lighting' },
  { icon: '📐', label: '4,492 Sq Ft', sub: 'Combined living space' },
]

const SPECS = [
  ['Address', '9432 & 9430 Oakmore Rd, Los Angeles CA 90035'],
  ['Neighborhood', 'Beverlywood / Pico-Robertson'],
  ['Price', '$34,999 / month'],
  ['Bedrooms', '5 Bedrooms'],
  ['Bathrooms', '6 (5 full, 1 half)'],
  ['Living Space', '4,492 sq ft combined'],
  ['Lot Size', '7,283 sq ft'],
  ['Guest House', '~400 sq ft — separate entrance'],
  ['Lease Minimum', '30 days'],
  ['Available', 'By appointment'],
  ['Furnished', 'Fully Furnished — luxury curated'],
  ['Kosher Kitchen', '✓ Full kosher kitchen'],
  ['Synagogue', 'Walking distance to major shuls'],
  ['Circle Park', '3-minute walk'],
  ['FIFA 2026', 'May – August 2026 available'],
]

export default function LuxuryRental() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Luxury Rentals</span>
          <a href="tel:424-272-5935" style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            📞 424-272-5935
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', height: '70vh', minHeight: '500px', background: 'linear-gradient(135deg, #0a0e1a 0%, #1a2a1a 100%)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'url(https://img.youtube.com/vi/-j1TuUMxE_s/maxresdefault.jpg) center/cover no-repeat', opacity: 0.4 }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '0 60px 60px', width: '100%' }}>
          <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: '100px', padding: '6px 16px', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#f5a623', marginBottom: '20px' }}>
            SevenNova.ai · Luxury Rentals · Beverlywood
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '16px', maxWidth: '700px' }}>
            9432 & 9430 Oakmore Rd<br />
            <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Gated Beverlywood Compound
            </span>
          </h1>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '15px', color: '#94a3b8' }}>
            <span>🛏 5 Bedrooms</span>
            <span>🚿 6 Bathrooms</span>
            <span>📐 4,492 sq ft</span>
            <span>💰 $34,999/mo</span>
            <span>⚽ FIFA 2026 Available</span>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px 0' }}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(245,166,35,0.2)' }}>
          <iframe
            src="https://www.youtube.com/embed/-j1TuUMxE_s"
            title="9432 Oakmore Rd Property Tour"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          />
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#475569', marginTop: '12px' }}>Full property video walkthrough</p>
      </section>

      {/* AMENITIES */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 40px' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>Property Features</p>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, letterSpacing: '-1px', textAlign: 'center', marginBottom: '48px' }}>Luxury at Every Level</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {AMENITIES.map(a => (
            <div key={a.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9', marginBottom: '4px' }}>{a.label}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{a.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SPECS + CONTACT */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>

        {/* SPECS */}
        <div>
          <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Property Details</p>
          <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '32px' }}>Full Specifications</h2>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            {SPECS.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < SPECS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '13px', gap: '16px' }}>
                <span style={{ color: '#64748b', flexShrink: 0 }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CONTACT FORM */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '20px', padding: '40px', position: 'sticky', top: '80px' }}>
          <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>Schedule a Showing</p>
          <h3 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Request a Tour</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>Contact Daniel Issak directly. Showings by appointment only.</p>

          {submitted ? (
            <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#f5a623', fontWeight: 700 }}>
              ✓ Request received. We will contact you within 2 hours.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { placeholder: 'Full Name', value: name, set: setName, type: 'text' },
                { placeholder: 'Email Address', value: email, set: setEmail, type: 'email' },
                { placeholder: 'Phone Number', value: phone, set: setPhone, type: 'tel' },
              ].map(f => (
                <input
                  key={f.placeholder}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%' }}
                />
              ))}
              <button
                onClick={() => (name && email) && setSubmitted(true)}
                style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', border: 'none', borderRadius: '10px', padding: '16px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
                Request Showing →
              </button>
              <a href="tel:424-272-5935" style={{ display: 'block', textAlign: 'center', color: '#64748b', fontSize: '13px', textDecoration: 'none', marginTop: '8px' }}>
                Or call directly: <span style={{ color: '#f5a623', fontWeight: 700 }}>424-272-5935</span>
              </a>
            </div>
          )}

          <div style={{ marginTop: '28px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '12px', color: '#475569', lineHeight: 1.7 }}>
            <strong style={{ color: '#94a3b8' }}>Daniel Issak</strong><br />
            DRE #02037760 · Real Estate Source, Inc.<br />
            DRE #01869619
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px', textAlign: 'center' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '12px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · Luxury Rentals · The Issak Group · DRE #02037760</p>
      </footer>

    </div>
  )
}
