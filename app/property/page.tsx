'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

type PermitRecord = { pcis_permit?: string; permit_type?: string; latest_status?: string; issue_date?: string; work_description?: string; zone?: string }
type InspectionRecord = { permit_nbr?: string; inspection_date?: string; inspection_type?: string; result?: string }

type PropertyData = {
  loading: boolean
  error: string
  permits: PermitRecord[]
  inspections: InspectionRecord[]
  zone: string
  risk: string
  riskColor: string
  openCases: number
}

function parseAddress(address: string) {
  const parts = address.trim().split(' ')
  const num = parts[0]
  const direction = ['N','S','E','W'].includes(parts[1]?.toUpperCase()) ? parts[1] : ''
  const street = direction ? parts.slice(2).join(' ') : parts.slice(1).join(' ')
  return { num, direction, street: street.replace(/,.*/, '').trim() }
}

function getRiskFromPermits(permits: PermitRecord[], inspections: InspectionRecord[]) {
  const expired = permits.filter(p => p.latest_status?.toLowerCase().includes('expired') || p.latest_status?.toLowerCase().includes('cancel')).length
  const denied = inspections.filter(i => i.result?.toLowerCase().includes('fail') || i.result?.toLowerCase().includes('denied')).length
  if (expired > 2 || denied > 1) return { risk: 'HIGH', color: '#ef4444' }
  if (expired > 0 || denied > 0) return { risk: 'MEDIUM', color: '#f59e0b' }
  return { risk: 'LOW', color: '#10b981' }
}

function PropertyPreview() {
  const params = useSearchParams()
  const address = params.get('address') || ''

  const [data, setData] = useState<PropertyData>({
    loading: true, error: '', permits: [], inspections: [],
    zone: '', risk: '', riskColor: '', openCases: 0
  })

  useEffect(() => {
    if (!address) return
    async function fetchLADBS() {
      try {
        const { num, direction, street } = parseAddress(address)
        const streetClean = street.replace(/blvd|ave|st|dr|rd|ln|way|pl|ct/gi, '').trim()

        // LA Build Permits API
        const permitUrl = `https://data.lacity.org/resource/xnhu-aczu.json?address_start=${encodeURIComponent(num)}&$limit=10`
        // LADBS Inspections API
        const inspectUrl = `https://data.lacity.org/resource/9w5z-rg2h.json?address=${encodeURIComponent(num + ' ' + (direction ? direction + ' ' : '') + streetClean)}&$limit=10`

        const [permitRes, inspectRes] = await Promise.allSettled([
          fetch(permitUrl).then(r => r.json()),
          fetch(inspectUrl).then(r => r.json()),
        ])

        const permits: PermitRecord[] = permitRes.status === 'fulfilled' ? (Array.isArray(permitRes.value) ? permitRes.value : []) : []
        const inspections: InspectionRecord[] = inspectRes.status === 'fulfilled' ? (Array.isArray(inspectRes.value) ? inspectRes.value : []) : []

        const { risk, color } = getRiskFromPermits(permits, inspections)
        const zone = permits[0]?.zone || 'See full report'
        const openCases = permits.filter(p => p.latest_status?.toLowerCase().includes('issued') || p.latest_status?.toLowerCase().includes('open')).length

        setData({ loading: false, error: '', permits, inspections, zone, risk, riskColor: color, openCases })
      } catch {
        setData(d => ({ ...d, loading: false, error: 'Could not load LADBS data. Try a full LA address.' }))
      }
    }
    fetchLADBS()
  }, [address])

  if (data.loading) return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid rgba(245,166,35,0.2)', borderTop: '3px solid #f5a623', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b' }}>Scanning LADBS records...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const hasRealData = data.permits.length > 0 || data.inspections.length > 0

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
          <span style={{ fontSize: '11px', color: '#64748b', letterSpacing: '3px', textTransform: 'uppercase' }}>
            {hasRealData ? '✓ Live LADBS Data' : 'AI Property Analysis'}
          </span>
          <h1 style={{ fontSize: 'clamp(18px, 3vw, 30px)', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '8px', color: '#f1f5f9', lineHeight: 1.3 }}>{address}</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
            {hasRealData ? `${data.permits.length} permit records · ${data.inspections.length} inspection records found` : 'Los Angeles · SevenNova Intelligence Preview'}
          </p>
        </div>

        {/* RISK */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: `rgba(${data.risk === 'HIGH' ? '239,68,68' : data.risk === 'MEDIUM' ? '245,158,11' : '16,185,129'},0.1)`, border: `1px solid ${data.riskColor}`, borderRadius: '100px', padding: '10px 24px', marginBottom: '40px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: data.riskColor }} />
          <span style={{ fontWeight: 700, fontSize: '15px', color: data.riskColor }}>RISK LEVEL: {data.risk}</span>
        </div>

        {/* FREE PREVIEW */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
              {hasRealData ? '✓ Live LADBS Preview' : 'Free Preview'}
            </h2>
            <span style={{ fontSize: '12px', color: '#f5a623', background: 'rgba(245,166,35,0.1)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(245,166,35,0.3)' }}>PARTIAL DATA</span>
          </div>

          {[
            ['Address', address],
            ['Permit Records Found', hasRealData ? `${data.permits.length} records in LADBS` : 'Run full search'],
            ['Inspection Records', hasRealData ? `${data.inspections.length} inspections on file` : 'Run full search'],
            ['Open/Issued Permits', hasRealData ? (data.openCases > 0 ? `⚠ ${data.openCases} open permit(s) detected` : '✓ No open permits') : 'Requires full report'],
            ['Zoning (from permits)', data.zone || 'Requires full report'],
            ['Most Recent Permit', data.permits[0]?.issue_date ? new Date(data.permits[0].issue_date).toLocaleDateString() : 'See full report'],
            ['Last Permit Type', data.permits[0]?.permit_type || 'See full report'],
            ['Last Permit Status', data.permits[0]?.latest_status || 'See full report'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b', flexShrink: 0 }}>{k}</span>
              <span style={{ fontWeight: 600, color: String(v).includes('⚠') ? '#ef4444' : String(v).includes('✓') ? '#10b981' : '#e2e8f0', textAlign: 'right' }}>{String(v)}</span>
            </div>
          ))}
        </div>

        {/* RECENT PERMITS TABLE */}
        {data.permits.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#94a3b8' }}>Recent Permit History (Public Records)</h3>
            {data.permits.slice(0, 3).map((p, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b' }}>{p.permit_type || 'Permit'} — {p.issue_date ? new Date(p.issue_date).toLocaleDateString() : 'N/A'}</span>
                <span style={{ color: p.latest_status?.toLowerCase().includes('expired') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{p.latest_status || 'Unknown'}</span>
              </div>
            ))}
            <p style={{ fontSize: '11px', color: '#334155', marginTop: '12px' }}>Source: City of Los Angeles LADBS · data.lacity.org</p>
          </div>
        )}

        {/* LOCKED */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '32px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,26,0.8)', backdropFilter: 'blur(4px)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '32px' }}>🔒</span>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Full Report — $497</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Delivered in 24 hours</span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', filter: 'blur(3px)' }}>Full Intelligence Report</h2>
          {['All LADBS code enforcement cases (CEIS)', 'Complete permit history + expired/denied', 'Unpermitted work detection', 'Ownership chain + deed + lien history', 'Full zoning + overlay districts + setbacks', 'AI risk score A–F + investment grade', 'Development + ADU feasibility', 'AI-written due diligence PDF summary'].map(item => (
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
        <p>Scanning LADBS records...</p>
      </div>
    }>
      <PropertyPreview />
    </Suspense>
  )
}
