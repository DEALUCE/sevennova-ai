'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const RISK_DATA: Record<string, { zone: string; use: string; violations: number; risk: string; color: string; far: string; height: string; adu: string }> = {
  default: { zone: 'R1 — Single Family', use: 'Residential', violations: 0, risk: 'LOW', color: '#10b981', far: '0.5x', height: '28 ft', adu: 'Eligible' },
  jefferson: { zone: 'C2-1 — Commercial', use: 'Retail, Office, Mixed-Use', violations: 2, risk: 'HIGH', color: '#ef4444', far: '1.5x', height: '45 ft', adu: 'Not eligible' },
}

function PropertyPreview() {
  const params = useSearchParams()
  const address = params.get('address') || '3612 W Jefferson Blvd, Los Angeles'
  const isJefferson = address.toLowerCase().includes('jefferson')
  const data = isJefferson ? RISK_DATA.jefferson : RISK_DATA.default

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <a href="/" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>← New Search</a>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 40px' }}>

        {/* ADDRESS */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase' }}>Property Analysis</span>
        </div>
        <h1 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '32px', color: '#f1f5f9' }}>{address}</h1>

        {/* RISK BADGE */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: `rgba(${data.risk === 'HIGH' ? '239,68,68' : '16,185,129'},0.1)`, border: `1px solid ${data.color}`, borderRadius: '100px', padding: '10px 20px', marginBottom: '40px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: data.color }} />
          <span style={{ fontWeight: 700, fontSize: '15px', color: data.color }}>RISK LEVEL: {data.risk}</span>
        </div>

        {/* FREE PREVIEW */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Free Preview</h2>
            <span style={{ fontSize: '12px', color: '#f5a623', background: 'rgba(245,166,35,0.1)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(245,166,35,0.3)' }}>PARTIAL DATA</span>
          </div>
          {[
            ['Zoning', data.zone],
            ['Permitted Use', data.use],
            ['Max FAR', data.far],
            ['Height Limit', data.height],
            ['ADU Potential', data.adu],
            ['Open Violations', data.violations > 0 ? `⚠ ${data.violations} detected` : '✓ None detected'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <span style={{ fontWeight: 600, color: v.toString().includes('⚠') ? '#ef4444' : '#e2e8f0' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* LOCKED SECTIONS */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '32px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,26,0.7)', backdropFilter: 'blur(4px)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔒</span>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Unlock Full Report — $497</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Complete due diligence in 24 hours</span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', filter: 'blur(4px)' }}>Full Violation Report</h2>
          {['LADBS Case History', 'Permit Records', 'Code Enforcement Files', 'Unpermitted Work Flags', 'Ownership History', 'AI Risk Summary + Investment Grade'].map(item => (
            <div key={item} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px', color: '#64748b', filter: 'blur(3px)' }}>{item}</div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px' }}>Get the Full Intelligence Report</h2>
          <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '8px' }}>Zoning · Violations · Permits · Ownership · AI Risk Score · Investment Grade</p>
          <p style={{ color: '#475569', fontSize: '13px', marginBottom: '32px' }}>Delivered in 24 hours. One-time fee. No subscription.</p>
          <a href={`/reports?address=${encodeURIComponent(address)}`}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none' }}>
            Get Full Report — $497 →
          </a>
          <p style={{ fontSize: '12px', color: '#475569', marginTop: '16px' }}>🔒 Secure checkout · 100% money-back if no violations are found and you disagree with our analysis</p>
        </div>

        {/* TRUST */}
        <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize: '13px', color: '#475569', lineHeight: 1.8, textAlign: 'center' }}>
          <strong style={{ color: '#64748b' }}>Why SevenNova.ai?</strong><br />
          Our founder purchased a $1.7M property with hidden LADBS violations that no platform detected.<br />
          We built SevenNova.ai so it never happens to you.
        </div>

      </div>
    </div>
  )
}

export default function PropertyPage() {
  return <Suspense><PropertyPreview /></Suspense>
}
