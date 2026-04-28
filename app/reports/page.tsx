'use client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

const INCLUDES = [
  '✓ Complete zoning classification + permitted uses',
  '✓ All open violations + code enforcement cases',
  '✓ Full permit history (approved, expired, denied)',
  '✓ Unpermitted work flags + structural risk',
  '✓ Ownership history + deed records',
  '✓ AI investment risk score (A–F grade)',
  '✓ Development potential analysis',
  '✓ AI-written due diligence summary',
  '✓ PDF report delivered in 24 hours',
]

function ReportsForm() {
  const params = useSearchParams()
  const defaultAddress = params.get('address') || ''
  const [address, setAddress] = useState(defaultAddress)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleOrder = () => {
    if (!address || !name || !email) return
    setSubmitted(true)
  }

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Property Intelligence Report</span>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>

        {/* LEFT — WHAT YOU GET */}
        <div>
          <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Full Intelligence Report</p>
          <h1 style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '24px', lineHeight: 1.2 }}>
            Know Everything<br />Before You Close
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.8, marginBottom: '32px' }}>
            Our founder bought a $1.7M property with 2 hidden LADBS violations that no platform caught. We built this report so it never happens to you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
            {INCLUDES.map(item => (
              <div key={item} style={{ fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#f5a623', flexShrink: 0 }}>{item.slice(0,1)}</span>
                <span>{item.slice(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8 }}>
              <strong style={{ color: '#64748b' }}>Delivery:</strong> 24 hours via email<br />
              <strong style={{ color: '#64748b' }}>Format:</strong> Professional PDF + online view<br />
              <strong style={{ color: '#64748b' }}>Coverage:</strong> Any US property address<br />
              <strong style={{ color: '#64748b' }}>Guarantee:</strong> 100% money-back if unsatisfied
            </div>
          </div>
        </div>

        {/* RIGHT — ORDER FORM */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: '20px', padding: '40px', position: 'sticky', top: '80px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#f5a623', marginBottom: '12px' }}>Order Received!</h2>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.8 }}>
                We will email your full report to <strong style={{ color: '#94a3b8' }}>{email}</strong> within 24 hours.<br /><br />
                Questions? Email <a href="mailto:info@sevennova.ai" style={{ color: '#f5a623' }}>info@sevennova.ai</a>
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 900 }}>Order Report</h2>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$497</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>one-time</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>PROPERTY ADDRESS *</label>
                  <input value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="123 Main St, Los Angeles CA 90001"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>FULL NAME *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Daniel Issak"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'block' }}>EMAIL ADDRESS *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>

                <button onClick={handleOrder}
                  style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', border: 'none', borderRadius: '12px', padding: '18px', fontWeight: 900, fontSize: '17px', cursor: 'pointer', marginTop: '8px' }}>
                  Order Full Report — $497 →
                </button>
                <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center' }}>🔒 Secure · 24hr delivery · Money-back guarantee</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return <Suspense><ReportsForm /></Suspense>
}
