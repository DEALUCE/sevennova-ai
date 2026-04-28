'use client'
import { useState } from 'react'

const SECTIONS = [
  { label: 'Aerial', images: ['DJI_20250122125313_0947_D.jpg','DJI_20250122125346_0953_D.jpg','DJI_20250122125449_0960_D.jpg','DJI_20250122125517_0966_D.jpg'] },
  { label: 'Exterior', images: ['exterior-1.jpg','exterior-2.jpg','exterior-3.jpg','exterior-4.jpg'] },
  { label: 'Living', images: ['living-1.jpg','living-2.jpg','second-living-1.jpg','second-living-2.jpg','second-living-3.jpg'] },
  { label: 'Kitchen', images: ['kitchen-1.jpg','kitchen-2.jpg','kitchen-3.jpg','kitchen-4.jpg'] },
  { label: 'Primary Suite', images: ['primary-suite.jpg','primary-suite-1.jpg','primary-suite-2.jpg','primary-suite-3.jpg','primary-suite-4.jpg','primary-closet.jpg'] },
  { label: 'Bedrooms', images: ['bedroom-2-1.jpg','bedroom-3.jpg','bedroom-4.jpg'] },
  { label: 'Bathrooms', images: ['bathroom-2.jpg','bathroom-3.jpg','bathroom-4.jpg'] },
  { label: 'Pool & Outdoor', images: ['pool-1.jpg','pool-2.jpg','pool-3.jpg','outdoor-patio.jpg'] },
  { label: 'Guest House', images: ['guest-house-1.jpg','guest-house-2.jpg','guest-house-3.jpg','guest-house-4.jpg','guest-house-5.jpg','guest-house-kitchen.jpg','guest-house-bath.jpg'] },
  { label: 'Office', images: ['office.jpg','office-1.jpg','office-rromm-3.jpg','office-bathroom.jpg'] },
]

export default function Gallery() {
  const [active, setActive] = useState<string|null>(null)

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/luxury-rental" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none' }}>← Back to Property</a>
          <a href="tel:424-272-5935" style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>📞 Schedule Tour</a>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 40px' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>9432 & 9430 Oakmore Rd</p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '48px' }}>Property Gallery</h1>

        {SECTIONS.map(s => (
          <div key={s.label} style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f5a623', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid rgba(245,166,35,0.2)' }}>{s.label}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {s.images.map(img => (
                <div key={img} onClick={() => setActive(`/images/${img}`)} style={{ borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/3', background: '#111827' }}>
                  <img src={`/images/${img}`} alt={s.label} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* LIGHTBOX */}
      {active && (
        <div onClick={() => setActive(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={active} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setActive(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  )
}
