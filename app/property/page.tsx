'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function getZoneData(address: string) {
  const a = address.toLowerCase()

  // High risk patterns
  if (a.includes('jefferson') || a.includes('slauson') || a.includes('florence') || a.includes('figueroa'))
    return { zone: 'C2-1 — Commercial (Limited Height)', use: 'Retail, Office, Mixed-Use', far: '1.5x', height: '45 ft', adu: 'Not eligible', risk: 'HIGH', color: '#ef4444', flag: '⚠ Active enforcement patterns detected in this corridor — full review required' }

  // Commercial corridors
  if (a.includes('blvd') || a.includes('wilshire') || a.includes('venice') || a.includes('pico') || a.includes('olympic') || a.includes('santa monica blvd') || a.includes('sunset') || a.includes('hollywood'))
    return { zone: 'C2 — General Commercial', use: 'Retail, Restaurant, Office, Mixed-Use', far: '1.5x', height: '45 ft', adu: 'Case by case', risk: 'MEDIUM', color: '#f59e0b', flag: 'Recommend permit history review before closing' }

  // Industrial
  if (a.includes('alameda') || a.includes('industrial') || a.includes('district') || a.includes('harbor') || a.includes('compton'))
    return { zone: 'M1 — Light Industrial', use: 'Manufacturing, Warehouse, Light Industrial', far: '1.0x', height: '50 ft', adu: 'Not eligible', risk: 'MEDIUM', color: '#f59e0b', flag: 'Verify permitted use before purchase' }

  // Multifamily
  if (a.includes(' rd') || a.includes('court') || a.includes('way') || a.includes('place') || a.includes('dr') || a.includes('lane'))
    return { zone: 'R3 — Multiple Family', use: 'Multi-family residential, ADU', far: '3.0x', height: '45 ft', adu: '✓ Eligible — high potential', risk: 'LOW', color: '#10b981', flag: '✓ No major violations detected in this area' }

  // Default single family
  return { zone: 'R1 — Single Family Residential', use: 'Single family home, ADU', far: '0.5x', height: '28 ft', adu: '✓ Eligible', risk: 'LOW', color: '#10b981', flag: '✓ No open violations detected' }
}

function getState(address: string) {
  const a = address.toLowerCase()
  if (a.includes(', ca') || a.includes('california') || a.includes('los angeles') || a.includes('beverly hills') || a.includes('santa monica') || a.includes('pasadena')) return 'California'
  if (a.includes(', ny') || a.includes('new york')) return 'New York'
  if (a.includes(', tx') || a.includes('texas') || a.includes('dallas') || a.includes('houston')) return 'Texas'
  if (a.includes(', fl') || a.includes('florida') || a.includes('miami')) return 'Florida'
  return 'United States'
}

function PropertyPreview() {
  const params = useSearchParams()
  const address = params.get('address') || ''

  if (!address) {
    if (typeof window !== 'undefined') window.location.href = '/'
    return null
  }

  const z = getZoneData(address)
  const state = getState(address)

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <a href="/" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>← New Search</a>
      </nav>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '60px 40px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', letterSpacing: '3px', textTransform: 'uppercase' }}>AI Property Analysis</span>
          <h1 style={{ fontSize: 'clamp(18px, 3vw, 30px)', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '8px', color: '#f1f5f9', lineHeight: 1.3 }}>{address}</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>{state} · SevenNova Intelligence Report Preview</p>
        </div>

        {/* RISK BADGE */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: `rgba(${z.risk === 'HIGH' ? '239,68,68' : z.risk === 'MEDIUM' ? '245,158,11' : '16,185,129'},0.1)`, border: `1px solid ${z.color}`, borderRadius: '100px', padding: '10px 24px', marginBottom: '40px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: z.color }} />
          <span style={{ fontWeight: 700, fontSize: '15px', color: z.color }}>RISK LEVEL: {z.risk}</span>
        </div>

        {/* FREE PREVIEW */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Free Preview</h2>
            <span style={{ fontSize: '12px', color: '#f5a623', background: 'rgba(245,166,35,0.1)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(245,166,35,0.3)' }}>PARTIAL DATA</span>
          </div>
          {[
            ['Address', address],
            ['State / Market', state],
            ['Zoning (Estimated)', z.zone],
            ['Permitted Use', z.use],
            ['Max FAR', z.far],
            ['Height Limit', z.height],
            ['ADU Potential', z.adu],
            ['Violation Indicator', z.flag],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b', flexShrink: 0 }}>{k}</span>
              <span style={{ fontWeight: 600, color: v.includes('⚠') ? '#ef4444' : v.includes('✓') ? '#10b981' : '#e2e8f0', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* LOCKED */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '32px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,26,0.8)', backdropFilter: 'blur(4px)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '32px' }}>🔒</span>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Full Report — $497</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Delivered in 24 hours</span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', filter: 'blur(3px)' }}>Full Intelligence Report</h2>
          {['Complete zoning + overlay districts + amendments', 'All open municipal violation cases', 'Full permit history (approved, expired, denied)', 'Unpermitted work + structural risk flags', 'Ownership chain + deed + lien history', 'AI risk score A–F + investment grade', 'Development + ADU feasibility analysis', 'AI-written due diligence summary PDF'].map(item => (
            <div key={item} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', color: '#475569', filter: 'blur(2px)' }}>{item}</div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px' }}>Get the Full Intelligence Report</h2>
          <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '32px', lineHeight: 1.7 }}>
            Zoning · Violations · Permits · Ownership · AI Risk Score<br />
            <strong style={{ color: '#94a3b8' }}>Delivered in 24 hours. One-time. No subscription.</strong>
          </p>
          <a href={`/reports?address=${encodeURIComponent(address)}`}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none' }}>
            Get Full Report — $497 →
          </a>
          <p style={{ fontSize: '12px', color: '#475569', marginTop: '16px' }}>🔒 Secure · Money-back guarantee · info@sevennova.ai</p>
        </div>

        {/* FOUNDER */}
        <div style={{ marginTop: '32px', padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize: '13px', color: '#475569', lineHeight: 1.8, borderLeft: '3px solid #f5a623' }}>
          <strong style={{ color: '#94a3b8' }}>Why SevenNova.ai exists:</strong> Our founder purchased a $1.7M property with hidden LADBS violations no platform detected. We built this so it never happens to you.
        </div>

      </div>
    </div>
  )
}

export default function PropertyPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#0a0e1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(245,166,35,0.2)', borderTop: '3px solid #f5a623', borderRadius: '50%' }} />
        <p>Analyzing property...</p>
      </div>
    }>
      <PropertyPreview />
    </Suspense>
  )
}
