import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Luxury Furnished Rental Los Angeles | 5BR Gated Compound | $34,999/mo | SevenNova.ai',
  description: 'Premium fully furnished rental in Los Angeles. 5BR/6BA gated compound in Beverlywood, 4,492 sq ft, heated pool, kosher kitchen, guest house. $34,999/mo. Available now.',
  keywords: 'furnished rental Los Angeles, luxury furnished home rental LA, fully furnished rental Los Angeles, executive furnished rental LA, luxury short term rental Los Angeles',
  alternates: { canonical: 'https://sevennova.ai/furnished-rental-los-angeles' },
}

export default function FurnishedRentalPage() {
  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,26,0.95)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </Link>
        <a href="tel:424-272-5935" style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>📞 424-272-5935</a>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 40px' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Fully Furnished · Beverlywood · Los Angeles</p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
          Luxury Furnished Rental<br />
          <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Los Angeles</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '40px' }}>
          Los Angeles's finest fully furnished luxury rental. 9432 & 9430 Oakmore Rd in Beverlywood — a gated 5-bedroom compound with curated luxury furnishings, heated pool, full kosher kitchen, and detached guest house. Move-in ready. $34,999/month.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
          <img src="/images/living-1.jpg" alt="Furnished rental Los Angeles living room" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', height: '250px' }} />
          <img src="/images/primary-suite.jpg" alt="Furnished rental Los Angeles primary suite" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', height: '250px' }} />
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>What's Included — Fully Furnished</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '48px' }}>
          {['Living room — curated luxury furniture', 'All 5 bedrooms — beds, linens, dressers', 'Primary suite — spa-style bath, steam sauna', 'Chef\'s kitchen — all appliances included', 'Dining room — table and seating for 10', 'Guest house — fully furnished separately', 'Pool furniture — loungers, umbrellas', 'Smart home — TV, sound system, lighting', 'Washer and dryer in unit', 'All outdoor furniture included'].map(item => (
            <div key={item} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: '#94a3b8' }}>
              <span style={{ color: '#f5a623', flexShrink: 0 }}>✓</span> {item}
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px' }}>Rental Terms</h2>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
          {[['Monthly Price', '$34,999 fully furnished'], ['Minimum Term', '30 days'], ['Security Deposit', '$34,999'], ['Pets', 'Considered case by case'], ['FIFA 2026', 'Available May 15 – Aug 15, 2026'], ['Available', 'By appointment']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <Link href="/luxury-rental" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none', marginBottom: '16px' }}>
          View Full Property & Schedule Tour →
        </Link>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '12px' }}>Call: <a href="tel:424-272-5935" style={{ color: '#f5a623' }}>424-272-5935</a> · <a href="mailto:info@sevennova.ai" style={{ color: '#f5a623' }}>info@sevennova.ai</a> · DRE #02037760</p>

        <div style={{ marginTop: '64px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>Also Browse</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[['Beverlywood Luxury Rental', '/beverlywood-luxury-rental'], ['Kosher Rental LA', '/kosher-rental-los-angeles'], ['FIFA 2026 Rental', '/fifa-2026-rental-los-angeles'], ['Luxury Rental 90035', '/luxury-rental-90035'], ['Full Listing', '/luxury-rental']].map(([label, href]) => (
              <Link key={href} href={href} style={{ fontSize: '13px', color: '#f5a623', textDecoration: 'none', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '6px 14px' }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · Furnished Rentals Los Angeles · The Issak Group · DRE #02037760</p>
      </footer>
    </div>
  )
}
