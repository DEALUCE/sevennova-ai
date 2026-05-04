'use client'
import { useState, ReactNode } from 'react'

const EXAMPLES = [
  '904 S Ardmore Ave, Los Angeles, CA 90006',
  '1234 Wilshire Blvd, Los Angeles, CA 90025',
  '6500 Sunset Blvd, Los Angeles, CA 90028',
]

function pill(val: boolean, yes: string, no: string, yesColor = '#4caf7d', noColor = '#e8c54a') {
  return val
    ? <span style={{ background: 'rgba(76,175,125,0.15)', color: yesColor, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{yes}</span>
    : <span style={{ background: 'rgba(232,197,74,0.15)', color: noColor, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{no}</span>
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 }}>
      <span style={{ color: '#64748b' }}>{k}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{v ?? '—'}</span>
    </div>
  )
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '22px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5a623', display: 'inline-block' }} />
        {label}
      </div>
      {children}
    </div>
  )
}

export default function ZoningPage() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  async function runReport(addr?: string) {
    const q = (addr ?? address).trim()
    if (!q) return
    if (addr) setAddress(addr)
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/zoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: q }),
      })
      const json = await res.json()
      if (json.error) setError(json.error)
      else setData(json)
    } catch {
      setError('Could not reach server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const s = { fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0' }

  return (
    <div style={s}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#f5a623,#f9d423)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: 14 }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <div style={{ display: 'flex', gap: 28, fontSize: 14 }}>
          <a href="/luxury-rental" style={{ color: '#64748b', textDecoration: 'none' }}>Luxury Rental</a>
          <a href="/reports" style={{ color: '#64748b', textDecoration: 'none' }}>Full Report</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 700, margin: '80px auto 0', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, marginBottom: 24 }}>
          LA Property Intelligence
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>
          Forensic <span style={{ color: '#f5a623' }}>Zoning</span> Report
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 44 }}>
          Enter any Los Angeles address. Get APN, zoning code, assessed value, TOC tier, development potential, and every grant you qualify for — instantly.
        </p>

        {/* Search */}
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', maxWidth: 600, margin: '0 auto 16px', transition: 'border-color 0.2s' }}>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runReport()}
            placeholder="9432 Oakmore Rd, Los Angeles, CA 90035"
            style={{ flex: 1, background: '#111827', border: 'none', outline: 'none', padding: '16px 20px', fontSize: 15, color: '#e2e8f0', fontFamily: 'inherit' }}
          />
          <button
            onClick={() => runReport()}
            disabled={loading}
            style={{ background: loading ? '#555' : '#f5a623', color: '#0a0e1a', border: 'none', padding: '16px 28px', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            {loading ? 'Searching…' : 'Run Report'}
          </button>
        </div>

        <div style={{ color: '#475569', fontSize: 13, marginBottom: 60 }}>
          Try:&nbsp;
          {EXAMPLES.map((e, i) => (
            <span key={i}>
              <span onClick={() => runReport(e)} style={{ color: '#f5a623', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                {e.split(',')[0]}
              </span>
              {i < EXAMPLES.length - 1 && '  ·  '}
            </span>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f5a623', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p>Pulling APN, zoning, and grant data…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ maxWidth: 600, margin: '20px auto', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', color: '#e05c5c', padding: '14px 20px', borderRadius: 10, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Report */}
      {data && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Header */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24, marginBottom: 32 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>{data.address || data.full_address}</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>APN {data.parcel?.apn || '—'} &nbsp;·&nbsp; {data.generated}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Parcel */}
            <Card label="Parcel Data">
              <Row k="APN" v={<code style={{ color: '#f5a623', fontSize: 13 }}>{data.parcel?.apn}</code>} />
              <Row k="Use Type" v={data.parcel?.use_type} />
              <Row k="Status" v={data.parcel?.status ? <span style={{ background: 'rgba(76,175,125,0.15)', color: '#4caf7d', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{data.parcel.status}</span> : '—'} />
              <Row k="Year Built" v={data.parcel?.year_built} />
              <Row k="Building Sqft" v={data.parcel?.sqft_building ? `${data.parcel.sqft_building.toLocaleString()} sq ft` : '—'} />
              <Row k="Lot Size" v={data.parcel?.sqft_lot ? `${data.parcel.sqft_lot.toLocaleString()} sq ft` : '—'} />
              <Row k="Lot Acres" v={data.parcel?.lot_acres} />
              <Row k="Dimensions" v={data.parcel?.lot_dimensions} />
              <Row k="Beds / Baths" v={data.parcel?.bedrooms && data.parcel?.bathrooms ? `${data.parcel.bedrooms} / ${data.parcel.bathrooms}` : '—'} />
              <Row k="Sewer" v={pill(data.parcel?.sewer, 'Connected', 'Check')} />
              <Row k="Exemption" v={data.parcel?.exemption || 'None'} />
              <Row k="Cluster" v={data.parcel?.cluster} />
            </Card>

            {/* Zoning + Overlays */}
            <Card label="Zoning & Overlays">
              <Row k="Zone Code" v={<code style={{ color: '#f5a623', fontSize: 13 }}>{data.zoning?.code}</code>} />
              <Row k="Description" v={data.zoning?.description} />
              <Row k="Multifamily" v={pill(data.zoning?.multifamily_eligible, 'Eligible', 'Not Eligible')} />
              <div style={{ margin: '14px 0 8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>Overlays</div>
              <Row k="TOC Tier" v={data.overlays?.toc_tier > 0 ? <span style={{ background: 'rgba(76,175,125,0.15)', color: '#4caf7d', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Tier {data.overlays.toc_tier}</span> : <span style={{ background: 'rgba(232,197,74,0.15)', color: '#e8c54a', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>None</span>} />
              {data.overlays?.toc_eligible && <Row k="Nearest Metro" v={`${data.overlays.nearest_metro_line} — ${data.overlays.distance_to_metro}`} />}
              <Row k="AB 2097 Zero Parking" v={pill(data.overlays?.ab2097_zero_parking, 'Exempt', 'Not Exempt')} />
              <Row k="Opportunity Zone" v={pill(data.overlays?.opportunity_zone, 'Yes', 'No', '#4caf7d', '#e8c54a')} />
              <Row k="Low Income Area" v={pill(data.overlays?.low_income_area, 'Yes — LMI', 'No', '#4caf7d', '#e8c54a')} />
            </Card>

            {/* Valuation */}
            <Card label="Assessed Value">
              <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#f5a623', lineHeight: 1, margin: '8px 0 4px' }}>
                ${Math.round((data.valuation?.total_assessed || 0) / 1000)}K
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Total assessed (Prop 13)</div>
              <Row k="Land Value" v={data.valuation?.land_value ? `$${data.valuation.land_value.toLocaleString()}` : '—'} />
              <Row k="Improvement Value" v={data.valuation?.improvement_value ? `$${data.valuation.improvement_value.toLocaleString()}` : '—'} />
              <Row k="Tax Status" v={data.valuation?.tax_status ? pill(data.valuation.tax_status === 'CURRENT', data.valuation.tax_status, data.valuation.tax_status) : '—'} />
              <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>{data.valuation?.note}</div>
            </Card>

            {/* Development */}
            <Card label="Development Potential">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
                {[
                  { num: data.development_potential?.base_units_by_right, lbl: 'By Right' },
                  { num: data.development_potential?.toc_units || data.development_potential?.base_units_by_right, lbl: 'TOC Bonus', color: '#f5a623' },
                  { num: data.development_potential?.max_potential_units, lbl: 'Max (MIIP)', color: '#7c6fff' },
                ].map(({ num, lbl, color }) => (
                  <div key={lbl} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: color || '#e2e8f0' }}>{num ?? '—'}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <Row k="TOC Density Bonus" v={data.development_potential?.toc_density_bonus} />
              <Row k="MIIP Available" v={pill(data.development_potential?.miip_available, 'Yes — 120% Bonus', 'No')} />
              <Row k="FAR Boost" v={data.development_potential?.far_boost_available} />
              <Row k="Approval Path" v={data.development_potential?.approval_path} />
            </Card>

            {/* Grants */}
            <div style={{ gridColumn: '1 / -1', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 22 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5a623', display: 'inline-block' }} />Grant Eligibility
              </div>

              {/* Summary */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                  { count: data.grants?.summary?.total_qualified, label: 'Fully Qualified', color: '#4caf7d', bg: 'rgba(76,175,125,0.08)', border: 'rgba(76,175,125,0.2)' },
                  { count: data.grants?.summary?.total_potential, label: 'Potential', color: '#e8c54a', bg: 'rgba(232,197,74,0.08)', border: 'rgba(232,197,74,0.2)' },
                  { count: data.grants?.summary?.total_ineligible, label: 'Not Eligible', color: '#64748b', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
                ].map(({ count, label, color, bg, border }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '12px 24px', background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{count ?? 0}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Qualified */}
              {data.grants?.qualified?.length > 0 && <>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4caf7d', marginBottom: 12 }}>
                  Fully Qualified ({data.grants.qualified.length})
                </div>
                {data.grants.qualified.map((g: any) => (
                  <div key={g.name} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 18px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                      <div style={{ color: '#f5a623', fontSize: 13, whiteSpace: 'nowrap' }}>{g.max_award}</div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{g.agency} · <span style={{ background: g.level === 'federal' ? 'rgba(124,111,255,0.15)' : g.level === 'state' ? 'rgba(76,175,125,0.15)' : 'rgba(232,197,74,0.15)', color: g.level === 'federal' ? '#7c6fff' : g.level === 'state' ? '#4caf7d' : '#e8c54a', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{g.level}</span></div>
                    <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.55, marginBottom: 8 }}>{g.description}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {g.match_reasons?.map((r: string) => (
                        <span key={r} style={{ background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.2)', color: '#4caf7d', fontSize: 12, padding: '3px 9px', borderRadius: 20 }}>✓ {r}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>⏱ {g.deadline}</div>
                    <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#7c6fff', fontSize: 13, textDecoration: 'none' }}>Learn more →</a>
                  </div>
                ))}
              </>}

              {/* Potential */}
              {data.grants?.potential?.length > 0 && <>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e8c54a', margin: '20px 0 12px' }}>
                  Worth Exploring ({data.grants.potential.length})
                </div>
                {data.grants.potential.map((g: any) => (
                  <div key={g.name} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px', marginBottom: 8, opacity: 0.75 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                      <div style={{ color: '#f5a623', fontSize: 13 }}>{g.max_award}</div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{g.agency}</div>
                    <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 6, color: '#7c6fff', fontSize: 13, textDecoration: 'none' }}>Learn more →</a>
                  </div>
                ))}
              </>}
            </div>

          </div>

          {/* Sources */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18, fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
            <strong style={{ color: '#94a3b8' }}>Data Sources:</strong> {data.data_sources?.join(' · ')}<br />
            <strong style={{ color: '#94a3b8' }}>Disclaimer:</strong> Verify zoning at <a href="https://zimas.lacity.org" target="_blank" rel="noopener noreferrer" style={{ color: '#7c6fff' }}>ZIMAS</a>, assessed values at <a href="https://portal.assessor.lacounty.gov" target="_blank" rel="noopener noreferrer" style={{ color: '#7c6fff' }}>LA County Assessor</a>, and grant eligibility with the issuing agency before making investment decisions.
          </div>
        </div>
      )}
    </div>
  )
}
