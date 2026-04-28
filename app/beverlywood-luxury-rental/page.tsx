import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Beverlywood Luxury Rental | Gated 5BR Compound | $34,999/mo | SevenNova.ai',
  description: 'Luxury furnished rental in Beverlywood, Los Angeles. 5BR/6BA gated compound with heated pool, kosher kitchen, guest house. Walking distance to shuls. $34,999/mo. Available now.',
  keywords: 'Beverlywood luxury rental, luxury rental 90035, furnished rental Beverlywood, luxury home rental Pico Robertson, gated rental Beverlywood LA',
  alternates: { canonical: 'https://sevennova.ai/beverlywood-luxury-rental' },
}

const schema = {
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Beverlywood Luxury Rental — 9432 Oakmore Rd, Los Angeles CA 90035",
  "description": "Gated 5-bedroom luxury compound in Beverlywood. Heated pool, kosher kitchen, guest house. $34,999/mo fully furnished.",
  "url": "https://sevennova.ai/beverlywood-luxury-rental",
  "address": { "@type": "PostalAddress", "streetAddress": "9432 & 9430 Oakmore Rd", "addressLocality": "Los Angeles", "addressRegion": "CA", "postalCode": "90035", "addressCountry": "US" },
  "offers": { "@type": "Offer", "price": "34999", "priceCurrency": "USD" }
}

export default function BeverlywoodPage() {
  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,26,0.95)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </Link>
        <a href="tel:424-272-5935" style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>📞 424-272-5935</a>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 40px' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Beverlywood · Los Angeles 90035</p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
          Beverlywood Luxury Rental<br />
          <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Gated 5BR Compound</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '48px' }}>
          The most exclusive furnished rental in Beverlywood. 9432 & 9430 Oakmore Rd — a gated 5-bedroom luxury compound with heated pool, full kosher kitchen, detached guest house, and walking distance to major shuls in the heart of LA's premier Jewish neighborhood.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '48px' }}>
          {[['5 Bedrooms', '6 bathrooms'], ['4,492 Sq Ft', 'Combined living'], ['$34,999/mo', 'Fully furnished'], ['Kosher Kitchen', 'Full setup'], ['Heated Pool', '& Spa'], ['Guest House', '~400 sq ft']].map(([a, b]) => (
            <div key={a} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#f5a623' }}>{a}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{b}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '40px' }}>
          <img src="/images/DJI_20250122125313_0947_D.jpg" alt="Beverlywood luxury rental 9432 Oakmore Rd Los Angeles" style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', height: '400px' }} />
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>About Beverlywood</h2>
        <p style={{ color: '#64748b', lineHeight: 1.9, marginBottom: '32px', fontSize: '15px' }}>
          Beverlywood (ZIP 90035) is one of Los Angeles's most sought-after Jewish neighborhoods, bordered by Beverly Hills, Century City, and Pico-Robertson. The neighborhood is known for its tree-lined streets, strong community, proximity to major synagogues, and excellent schools. 9432 Oakmore Rd sits at the heart of Beverlywood — walking distance to multiple shuls, Kosher restaurants on Pico Blvd, Circle Park, and minutes from Beverly Hills and Century City.
        </p>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>Why This is Beverlywood's Best Rental</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
          {[
            'Only gated compound rental available in Beverlywood',
            'Full kosher kitchen — dual sinks, dual ovens',
            'Walking distance to Young Israel, Adas Torah, and other major shuls',
            '3-minute walk to Circle Park — perfect for families',
            'Detached guest house — ideal for extended family',
            'Heated pool and spa, steam sauna, smart home',
            'Fully furnished with luxury curated furnishings',
            'Available for FIFA World Cup 2026 (May–August 2026)',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#94a3b8' }}>
              <span style={{ color: '#f5a623' }}>✓</span> {item}
            </div>
          ))}
        </div>

        <Link href="/luxury-rental" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none', marginBottom: '16px' }}>
          View Full Property & Schedule Tour →
        </Link>
        <p style={{ fontSize: '13px', color: '#475569' }}>Or call Daniel Issak: <a href="tel:424-272-5935" style={{ color: '#f5a623' }}>424-272-5935</a> · DRE #02037760</p>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · Beverlywood Luxury Rentals · The Issak Group · DRE #02037760</p>
      </footer>
    </div>
  )
}
