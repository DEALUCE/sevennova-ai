import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026 Rental Los Angeles | Luxury 5BR | $34,999/mo | SevenNova.ai',
  description: 'Luxury FIFA 2026 rental in Los Angeles. Gated 5BR/6BA compound in Beverlywood, 4,492 sq ft, heated pool, fully furnished. Available May 15 – August 15, 2026. $34,999/mo.',
  keywords: 'FIFA 2026 rental Los Angeles, FIFA World Cup 2026 housing LA, luxury rental FIFA 2026, Los Angeles FIFA rental, furnished rental FIFA 2026 LA, executive housing FIFA World Cup',
  alternates: { canonical: 'https://sevennova.ai/fifa-2026-rental-los-angeles' },
}

const schema = {
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "FIFA World Cup 2026 Luxury Rental — Los Angeles CA",
  "description": "Gated 5BR luxury compound available for FIFA World Cup 2026. May 15 – August 15, 2026. Heated pool, fully furnished, Beverlywood Los Angeles. $34,999/mo.",
  "url": "https://sevennova.ai/fifa-2026-rental-los-angeles",
  "address": { "@type": "PostalAddress", "streetAddress": "9432 & 9430 Oakmore Rd", "addressLocality": "Los Angeles", "addressRegion": "CA", "postalCode": "90035", "addressCountry": "US" },
  "offers": { "@type": "Offer", "price": "34999", "priceCurrency": "USD", "availabilityStarts": "2026-05-15", "availabilityEnds": "2026-08-15" }
}

export default function FIFAPage() {
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
        <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: '100px', padding: '6px 20px', fontSize: '12px', letterSpacing: '3px', color: '#f5a623', marginBottom: '24px', textTransform: 'uppercase' }}>
          ⚽ FIFA World Cup 2026 · Los Angeles
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
          FIFA 2026 Luxury Rental<br />
          <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Los Angeles</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '40px' }}>
          The ultimate FIFA World Cup 2026 rental in Los Angeles. A gated 5-bedroom luxury compound in Beverlywood — 4,492 sq ft, heated pool, fully furnished. Available May 15 through August 15, 2026. Perfect for executives, teams, sponsors, and families attending the World Cup.
        </p>

        <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '40px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px', textAlign: 'center' }}>
          {[['May 15', 'Available From'], ['Aug 15, 2026', 'Available Until'], ['$34,999/mo', 'Fully Furnished']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#f5a623' }}>{v}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '40px' }}>
          <img src="/images/pool-1.jpg" alt="FIFA 2026 luxury rental Los Angeles heated pool" style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', height: '400px' }} />
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>Perfect for FIFA 2026 in LA</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {[
            'Located in Beverlywood — 15 minutes from SoFi Stadium (FIFA 2026 venue)',
            '5 bedrooms + detached guest house — sleeps up to 10',
            'Heated pool and spa — perfect for entertaining',
            'Gated and private — ideal for executives and VIP guests',
            'Fully furnished — move-in ready May 15, 2026',
            '10 minutes to Beverly Hills, Century City, and West Hollywood',
            'EV charging, smart home, Ring security',
            'Dedicated showing agent — schedule today',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#94a3b8' }}>
              <span style={{ color: '#f5a623' }}>✓</span> {item}
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px' }}>FIFA 2026 Los Angeles Schedule</h2>
        <p style={{ color: '#64748b', lineHeight: 1.9, marginBottom: '40px', fontSize: '15px' }}>
          FIFA World Cup 2026 matches in Los Angeles will be held at SoFi Stadium in Inglewood, including multiple group stage matches, a quarterfinal, and a semifinal. The LA metro area is expected to host hundreds of thousands of international visitors. Executive housing near Beverly Hills, West Hollywood, and Beverlywood is extremely limited. This property is one of the only gated luxury compounds available for the full tournament window.
        </p>

        <Link href="/luxury-rental" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none', marginBottom: '16px' }}>
          View Full Property & Book →
        </Link>
        <p style={{ fontSize: '13px', color: '#475569' }}>Call: <a href="tel:424-272-5935" style={{ color: '#f5a623' }}>424-272-5935</a> · <a href="mailto:info@sevennova.ai" style={{ color: '#f5a623' }}>info@sevennova.ai</a> · DRE #02037760</p>

        <div style={{ marginTop: '64px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>Also Browse</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[['Beverlywood Luxury Rental', '/beverlywood-luxury-rental'], ['Furnished Rental LA', '/furnished-rental-los-angeles'], ['Kosher Rental LA', '/kosher-rental-los-angeles'], ['Luxury Rental 90035', '/luxury-rental-90035'], ['Full Listing', '/luxury-rental']].map(([label, href]) => (
              <Link key={href} href={href} style={{ fontSize: '13px', color: '#f5a623', textDecoration: 'none', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '6px 14px' }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · FIFA 2026 Luxury Rentals Los Angeles · The Issak Group · DRE #02037760</p>
      </footer>
    </div>
  )
}
