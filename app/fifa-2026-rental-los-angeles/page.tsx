import Script from 'next/script'
import Link from 'next/link'

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://sevennova.ai/fifa-2026-rental-los-angeles#webpage',
      url: 'https://sevennova.ai/fifa-2026-rental-los-angeles',
      name: 'FIFA 2026 Luxury Rental Los Angeles | Beverlywood | From $34,999/mo',
      description: 'Premium FIFA World Cup 2026 rental in Los Angeles. Gated 5BR luxury compound in Beverlywood, 15 minutes from SoFi Stadium. Available May–August 2026.',
      isPartOf: { '@id': 'https://sevennova.ai/#website' },
      breadcrumb: { '@id': 'https://sevennova.ai/fifa-2026-rental-los-angeles#breadcrumb' },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.fifa-summary', '.faq-answer', '.match-schedule'],
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://sevennova.ai/fifa-2026-rental-los-angeles#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevennova.ai' },
        { '@type': 'ListItem', position: 2, name: 'Luxury Rentals', item: 'https://sevennova.ai/luxury-rental' },
        { '@type': 'ListItem', position: 3, name: 'FIFA 2026 Rental Los Angeles', item: 'https://sevennova.ai/fifa-2026-rental-los-angeles' },
      ],
    },
    {
      '@type': 'RealEstateListing',
      '@id': 'https://sevennova.ai/luxury-rental#listing',
      name: '9432 Oakmore Rd — FIFA 2026 Luxury Rental Los Angeles',
      description: 'Gated 5-bedroom luxury compound in Beverlywood, Los Angeles. 4,492 sq ft total. Heated pool and spa, kosher kitchen, detached guest house. 15 minutes from SoFi Stadium (FIFA 2026 venue). Available May 15 – August 15, 2026.',
      url: 'https://sevennova.ai/luxury-rental',
      image: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '9432 Oakmore Rd',
        addressLocality: 'Los Angeles',
        addressRegion: 'CA',
        postalCode: '90035',
        addressCountry: 'US',
      },
      geo: { '@type': 'GeoCoordinates', latitude: '34.0535', longitude: '-118.3877' },
      floorSize: { '@type': 'QuantitativeValue', value: 4492, unitCode: 'FTK' },
      numberOfRooms: 5,
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Heated Pool and Spa', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Kosher Kitchen', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Gated Compound', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Guest House', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'EV Charging Station', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Smart Home System', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Steam Sauna', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Fully Furnished', value: true },
      ],
    },
    {
      '@type': 'Event',
      name: 'FIFA World Cup 2026 Los Angeles',
      startDate: '2026-06-11',
      endDate: '2026-07-19',
      location: {
        '@type': 'SportsActivityLocation',
        name: 'SoFi Stadium',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1001 Stadium Dr',
          addressLocality: 'Inglewood',
          addressRegion: 'CA',
          postalCode: '90301',
        },
      },
      description: 'FIFA World Cup 2026 matches hosted at SoFi Stadium, Inglewood, CA. 15 minutes from 9432 Oakmore Rd luxury rental in Beverlywood.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Where is the best luxury rental for FIFA World Cup 2026 in Los Angeles?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '9432 Oakmore Rd in Beverlywood, Los Angeles is the premier FIFA 2026 luxury rental. Located 15 minutes from SoFi Stadium, the official FIFA 2026 LA venue, this gated 5-bedroom compound offers 4,492 sq ft, a heated pool, kosher kitchen, and guest house — available from $34,999/month for the full World Cup window.',
          },
        },
        {
          '@type': 'Question',
          name: 'How far is SoFi Stadium from Beverlywood for FIFA 2026?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SoFi Stadium in Inglewood is approximately 15 minutes by car from Beverlywood (90035). The drive is direct via La Cienega Blvd or Sepulveda Blvd. Beverlywood offers a quiet, residential alternative to hotel accommodations while staying close to the FIFA 2026 venue.',
          },
        },
        {
          '@type': 'Question',
          name: 'How many FIFA 2026 matches are in Los Angeles?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Los Angeles is scheduled to host multiple FIFA World Cup 2026 group stage matches and knockout round games at SoFi Stadium, including semi-final matches. LA is one of the marquee host cities for FIFA 2026, alongside New York, Dallas, and Miami.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the minimum stay for the FIFA 2026 rental in Beverlywood?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The minimum stay is 30 days. The FIFA 2026 availability window is May 15 – August 15, 2026. Guests may book the full three-month window or a minimum 30-day stay within that window. Monthly rate from $34,999.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is there a kosher option for FIFA 2026 rentals in Los Angeles?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. 9432 Oakmore Rd in Beverlywood is the only luxury FIFA 2026 rental in Los Angeles with a certified kosher kitchen featuring dual sinks, dual ovens, and kosher appliances. The property is walking distance to multiple synagogues and kosher restaurants on Pico Boulevard.',
          },
        },
        {
          '@type': 'Question',
          name: 'How many people does the FIFA 2026 rental accommodate?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The Beverlywood compound accommodates up to 12 guests: 5 bedrooms in the main house (9432 Oakmore Rd) plus 1 bedroom in the detached guest house (9430 Oakmore Rd, ~400 sq ft). 6 full bathrooms total. Ideal for families, executive delegations, or VIP groups attending FIFA 2026.',
          },
        },
      ],
    },
  ],
}

// FIFA 2026 LA match schedule (illustrative — confirm at fifa.com)
const matches = [
  { date: 'June 2026', round: 'Group Stage', note: 'Multiple group matches at SoFi Stadium' },
  { date: 'July 2026', round: 'Round of 16 / Quarterfinal', note: 'Knockout stage at SoFi Stadium' },
  { date: 'July 2026', round: 'Semi-Final', note: 'LA is a confirmed semi-final host city' },
]

const features = [
  { icon: '🏠', label: '5 Bedrooms', sub: '+ 1BR guest house' },
  { icon: '🚗', label: '15 min to SoFi', sub: 'Via La Cienega Blvd' },
  { icon: '🏊', label: 'Heated Pool & Spa', sub: 'Private, gated' },
  { icon: '🍳', label: 'Kosher Kitchen', sub: 'Dual sinks + ovens' },
  { icon: '📐', label: '4,492 Sq Ft', sub: 'Fully furnished' },
  { icon: '🔒', label: 'Gated Compound', sub: 'Full security system' },
  { icon: '⚡', label: 'EV Charging', sub: 'On-site' },
  { icon: '🛎️', label: 'Concierge Ready', sub: 'Ticket assistance available' },
]

export default function FIFARentalPage() {
  return (
    <>
      <Script
        id="fifa-rental-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', background: '#fff' }}>

        {/* Breadcrumb */}
        <nav style={{ background: '#f8f8f6', borderBottom: '1px solid #e8e8e4', padding: '12px 24px', fontSize: '13px', color: '#666' }}>
          <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>Home</Link>
          {' → '}
          <Link href="/luxury-rental" style={{ color: '#8b7355', textDecoration: 'none' }}>Luxury Rentals</Link>
          {' → '}
          <span>FIFA 2026 Rental Los Angeles</span>
        </nav>

        {/* Hero */}
        <section style={{ background: 'linear-gradient(135deg, #0a3d1f 0%, #1a6b3a 50%, #0a3d1f 100%)', color: '#fff', padding: '80px 24px 60px', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px 16px', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', fontFamily: 'sans-serif' }}>
              FIFA World Cup 2026 · Los Angeles
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '400', marginBottom: '20px', lineHeight: '1.2' }}>
              FIFA 2026 Luxury Rental<br />Los Angeles
            </h1>
            <p className="fifa-summary" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
              The premier FIFA World Cup 2026 accommodation in Los Angeles — a gated 5-bedroom compound in Beverlywood, 15 minutes from SoFi Stadium. Heated pool, kosher kitchen, fully furnished. Available May 15 – August 15, 2026.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="tel:+14242725935" style={{ display: 'inline-block', background: '#c9a84c', color: '#fff', padding: '14px 32px', textDecoration: 'none', fontSize: '16px', fontFamily: 'sans-serif', borderRadius: '2px' }}>
                Call 424-272-5935
              </a>
              <Link href="/luxury-rental" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '14px 32px', textDecoration: 'none', fontSize: '16px', fontFamily: 'sans-serif', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)' }}>
                View Property
              </Link>
            </div>
          </div>
        </section>

        {/* Price Bar */}
        <section style={{ background: '#c9a84c', color: '#fff', padding: '16px 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <strong style={{ fontSize: '18px' }}>From $34,999/month · Available May 15 – Aug 15, 2026 · 30-day minimum · 9432 Oakmore Rd, Beverlywood 90035</strong>
        </section>

        {/* Feature Grid */}
        <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
            {features.map((f) => (
              <div key={f.label} style={{ textAlign: 'center', padding: '24px 16px', border: '1px solid #e8e8e4', borderRadius: '2px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontWeight: '700', fontSize: '15px', fontFamily: 'sans-serif', marginBottom: '4px' }}>{f.label}</div>
                <div style={{ fontSize: '13px', color: '#666', fontFamily: 'sans-serif' }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Property Card */}
        <section style={{ maxWidth: '960px', margin: '0 auto 60px', padding: '0 24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '24px', borderBottom: '1px solid #e8e8e4', paddingBottom: '12px' }}>
            The Property: 9432 Oakmore Rd
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div>
              <img
                src="/images/DJI_20250122125313_0947_D.jpg"
                alt="9432 Oakmore Rd FIFA 2026 Luxury Rental Beverlywood Los Angeles"
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '2px' }}
              />
            </div>
            <div style={{ fontFamily: 'sans-serif' }}>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', marginBottom: '20px' }}>
                A fully gated luxury compound in Beverlywood, one of Los Angeles&apos;s most sought-after residential neighborhoods. The main residence at 9432 Oakmore Rd offers 4,092 sq ft with 4 bedrooms, 5 bathrooms, and a chef&apos;s kitchen. A detached guest house at 9430 Oakmore Rd adds 400 sq ft with a private bedroom and full bath.
              </p>
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                {[
                  ['Bedrooms', '5 total (4 main + 1 guest house)'],
                  ['Bathrooms', '6 full bathrooms'],
                  ['Total Area', '4,492 sq ft combined'],
                  ['Pool', 'Heated pool + spa'],
                  ['Kitchen', 'Full kosher kitchen'],
                  ['Parking', '3-car garage + street'],
                  ['Available', 'May 15 – Aug 15, 2026'],
                  ['Rate', '$34,999/month'],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f0f0ec' }}>
                    <td style={{ padding: '8px 0', color: '#888', width: '40%' }}>{label}</td>
                    <td style={{ padding: '8px 0', fontWeight: '600', color: '#1a1a1a' }}>{value}</td>
                  </tr>
                ))}
              </table>
              <Link href="/luxury-rental" style={{ display: 'inline-block', marginTop: '20px', background: '#1a1a1a', color: '#fff', padding: '12px 28px', textDecoration: 'none', fontSize: '14px' }}>
                Full Property Details →
              </Link>
            </div>
          </div>
        </section>

        {/* SoFi Stadium & FIFA Context */}
        <section style={{ background: '#f8f8f6', padding: '60px 24px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '32px', textAlign: 'center' }}>
              FIFA World Cup 2026 in Los Angeles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div style={{ fontFamily: 'sans-serif' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>SoFi Stadium — The FIFA 2026 Venue</h3>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', marginBottom: '16px' }}>
                  SoFi Stadium in Inglewood is one of the premier FIFA World Cup 2026 venues. With a capacity exceeding 70,000, it is the most technologically advanced stadium in the United States and serves as the home of the Los Angeles Rams and Chargers.
                </p>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#444' }}>
                  From 9432 Oakmore Rd in Beverlywood, SoFi Stadium is approximately <strong>15 minutes by car</strong> via La Cienega Blvd or Sepulveda Blvd — a direct, easy commute for every match day.
                </p>
              </div>
              <div style={{ fontFamily: 'sans-serif' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Why Beverlywood Over a Hotel</h3>
                <ul style={{ fontSize: '15px', lineHeight: '1.8', color: '#444', paddingLeft: '20px' }}>
                  <li>Private gated compound — no shared lobbies or corridors</li>
                  <li>Full kitchen for team or family meals</li>
                  <li>Heated pool for recovery and relaxation</li>
                  <li>3× more space than a 5-star hotel suite at comparable cost</li>
                  <li>Quiet, residential neighborhood — not the tourist corridor</li>
                  <li>Concierge and ticket assistance available</li>
                  <li>Adjacent guest house for staff, security, or overflow</li>
                </ul>
              </div>
            </div>

            {/* Match Schedule */}
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '400', marginBottom: '20px', fontFamily: 'sans-serif' }}>FIFA 2026 LA Match Schedule</h3>
              <div className="match-schedule" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {matches.map((m) => (
                  <div key={m.round} style={{ background: '#fff', padding: '20px', border: '1px solid #e8e8e4' }}>
                    <div style={{ fontSize: '13px', color: '#888', fontFamily: 'sans-serif', marginBottom: '6px' }}>{m.date}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'sans-serif', marginBottom: '6px' }}>{m.round}</div>
                    <div style={{ fontSize: '13px', color: '#555', fontFamily: 'sans-serif' }}>{m.note}</div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#888', fontFamily: 'sans-serif' }}>
                * Full match schedule available at <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026" target="_blank" rel="noopener noreferrer" style={{ color: '#8b7355' }}>FIFA.com</a>. Confirm dates before booking.
              </p>
            </div>
          </div>
        </section>

        {/* Guest Profile */}
        <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '32px', textAlign: 'center' }}>
            Who Books This Rental
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', fontFamily: 'sans-serif' }}>
            {[
              { type: 'Executive Delegations', desc: 'Corporate teams attending FIFA 2026 matches or business meetings in LA' },
              { type: 'VIP & Celebrity Groups', desc: 'High-profile guests requiring privacy, security, and a full-service compound' },
              { type: 'National Team Families', desc: 'Families of players or officials seeking kosher meals and a private residence' },
              { type: 'Kosher Travelers', desc: 'Jewish families attending FIFA 2026 who require kosher kitchen facilities' },
              { type: 'Extended Families', desc: 'Multi-generational groups (8–12 people) who prefer a house over multiple hotel rooms' },
            ].map((g) => (
              <div key={g.type} style={{ padding: '24px', background: '#f8f8f6', borderTop: '3px solid #c9a84c' }}>
                <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>{g.type}</div>
                <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{g.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ background: '#f8f8f6', padding: '60px 24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '40px', textAlign: 'center' }}>
              FIFA 2026 Rental — Frequently Asked Questions
            </h2>
            {[
              {
                q: 'Where is the best luxury rental for FIFA World Cup 2026 in Los Angeles?',
                a: '9432 Oakmore Rd in Beverlywood is the premier FIFA 2026 luxury rental — a gated 5-bedroom compound, 15 minutes from SoFi Stadium, from $34,999/month.',
              },
              {
                q: 'How far is SoFi Stadium from Beverlywood for FIFA 2026?',
                a: 'Approximately 15 minutes by car via La Cienega Blvd or Sepulveda Blvd. Beverlywood (90035) offers a quiet residential base with direct access to the FIFA 2026 venue.',
              },
              {
                q: 'How many FIFA 2026 matches are in Los Angeles?',
                a: 'Los Angeles (SoFi Stadium, Inglewood) is scheduled to host multiple group stage matches plus knockout round games including a semi-final. Full schedule at FIFA.com.',
              },
              {
                q: 'What is the minimum stay for the FIFA 2026 rental?',
                a: 'Minimum 30 days. The full availability window is May 15 – August 15, 2026. Monthly rate from $34,999. Security deposit equal to one month.',
              },
              {
                q: 'Is there a kosher FIFA 2026 rental in Los Angeles?',
                a: 'Yes. 9432 Oakmore Rd is the only luxury FIFA 2026 rental in LA with a certified kosher kitchen — dual sinks, dual ovens, kosher appliances — plus walking distance to Pico Boulevard synagogues and kosher restaurants.',
              },
              {
                q: 'How many guests can the FIFA 2026 rental accommodate?',
                a: 'Up to 12 guests: 5 bedrooms in the main house plus the detached 1-bedroom guest house. 6 full bathrooms. Ideal for families, delegations, or VIP groups.',
              },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: '28px', borderBottom: '1px solid #e8e8e4', paddingBottom: '28px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '10px', fontFamily: 'sans-serif' }}>{item.q}</h3>
                <p className="faq-answer" style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', fontFamily: 'sans-serif', margin: '0' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: '#1a1a1a', color: '#fff', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '16px' }}>Reserve for FIFA 2026</h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', marginBottom: '32px', lineHeight: '1.6' }}>
              One property. One window. The FIFA 2026 season in Los Angeles books fast — inquire now to confirm availability.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="tel:+14242725935" style={{ background: '#c9a84c', color: '#fff', padding: '16px 40px', textDecoration: 'none', fontSize: '17px' }}>
                Call 424-272-5935
              </a>
              <a href="mailto:info@sevennova.ai" style={{ background: 'transparent', color: '#fff', padding: '16px 40px', textDecoration: 'none', fontSize: '17px', border: '1px solid rgba(255,255,255,0.4)' }}>
                Email Us
              </a>
            </div>
            <p style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              Daniel Issak · DRE #02037760 · The Issak Group · SevenNova.ai
            </p>
          </div>
        </section>

        {/* Internal links */}
        <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '400', marginBottom: '24px', fontFamily: 'sans-serif' }}>Related Pages</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontFamily: 'sans-serif' }}>
            {[
              { href: '/luxury-rental', label: '9432 Oakmore Rd — Full Listing', desc: 'All photos, specs, contact form' },
              { href: '/luxury-rental/beverlywood-90035-luxury-homes-for-rent', label: 'Beverlywood Luxury Homes for Rent', desc: 'Neighborhood guide, pricing, FAQs' },
              { href: '/kosher-rental-los-angeles', label: 'Kosher Kitchen Rental LA', desc: 'The only kosher luxury rental in LA' },
            ].map((p) => (
              <Link key={p.href} href={p.href} style={{ display: 'block', padding: '20px', border: '1px solid #e8e8e4', textDecoration: 'none', color: '#1a1a1a' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px', color: '#8b7355' }}>{p.label}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>{p.desc}</div>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </>
  )
}
