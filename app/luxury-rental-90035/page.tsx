import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Luxury Rental 90035 | Beverlywood Los Angeles | 5BR Gated Compound | SevenNova.ai',
  description: 'Luxury furnished rental in zip code 90035 (Beverlywood, Los Angeles). 5BR/6BA gated compound, heated pool, kosher kitchen, guest house. $34,999/mo. Available now.',
  keywords: 'luxury rental 90035, home rental 90035, furnished rental zip 90035, Beverlywood rental 90035, luxury house rental 90035 LA',
  alternates: { canonical: 'https://sevennova.ai/luxury-rental-90035' },
}

export default function Zip90035Page() {
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
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>ZIP Code 90035 · Beverlywood · Los Angeles</p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
          Luxury Rental in 90035<br />
          <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Beverlywood, Los Angeles</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '48px' }}>
          The premier luxury rental available in ZIP code 90035. Located at 9432 Oakmore Rd in Beverlywood — a gated 5-bedroom compound with heated pool, full kosher kitchen, and detached guest house. Fully furnished at $34,999/month.
        </p>

        <div style={{ marginBottom: '40px' }}>
          <img src="/images/exterior-1.jpg" alt="Luxury rental 90035 Beverlywood Los Angeles exterior" style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', height: '400px' }} />
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>About ZIP Code 90035</h2>
        <p style={{ color: '#64748b', lineHeight: 1.9, marginBottom: '32px', fontSize: '15px' }}>
          ZIP code 90035 covers the Beverlywood neighborhood in Los Angeles, one of the city's most desirable residential areas. Bordered by Beverly Hills (90210) to the north and Culver City to the south, Beverlywood offers quiet tree-lined streets, strong community, and easy access to Century City, Fox Studios, Cedars-Sinai, and the 10 freeway. The area is particularly known for its Jewish community and walkability to synagogues, kosher restaurants, and Circle Park.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '48px' }}>
          {[['5 Bedrooms', '+ Guest House'], ['6 Bathrooms', '5 full, 1 half'], ['4,492 Sq Ft', 'Combined'], ['$34,999/mo', 'Fully Furnished'], ['Heated Pool', '& Spa'], ['Kosher Kitchen', 'Full setup']].map(([a, b]) => (
            <div key={a} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#f5a623' }}>{a}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{b}</div>
            </div>
          ))}
        </div>

        <Link href="/luxury-rental" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none', marginBottom: '16px' }}>
          View Full Property →
        </Link>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '12px' }}>Call: <a href="tel:424-272-5935" style={{ color: '#f5a623' }}>424-272-5935</a> · DRE #02037760</p>

        <div style={{ marginTop: '64px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>Also Browse</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[['Beverlywood Luxury Rental', '/beverlywood-luxury-rental'], ['Furnished Rental LA', '/furnished-rental-los-angeles'], ['Kosher Rental LA', '/kosher-rental-los-angeles'], ['FIFA 2026 Rental', '/fifa-2026-rental-los-angeles'], ['Full Listing', '/luxury-rental']].map(([label, href]) => (
              <Link key={href} href={href} style={{ fontSize: '13px', color: '#f5a623', textDecoration: 'none', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '6px 14px' }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · Luxury Rentals 90035 · The Issak Group · DRE #02037760</p>
      </footer>
    </div>
  )
}
