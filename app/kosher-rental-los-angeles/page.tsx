import Script from 'next/script'
import Link from 'next/link'

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://sevennova.ai/kosher-rental-los-angeles#webpage',
      url: 'https://sevennova.ai/kosher-rental-los-angeles',
      name: 'Kosher Kitchen Rental Los Angeles | Beverlywood | Luxury Home $34,999/mo',
      description: 'The only luxury rental in Los Angeles with a certified kosher kitchen. Beverlywood 90035, walking distance to Pico Boulevard synagogues and kosher restaurants.',
      isPartOf: { '@id': 'https://sevennova.ai/#website' },
      breadcrumb: { '@id': 'https://sevennova.ai/kosher-rental-los-angeles#breadcrumb' },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.kosher-summary', '.faq-answer', '.kosher-features'],
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://sevennova.ai/kosher-rental-los-angeles#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevennova.ai' },
        { '@type': 'ListItem', position: 2, name: 'Luxury Rentals', item: 'https://sevennova.ai/luxury-rental' },
        { '@type': 'ListItem', position: 3, name: 'Kosher Rental Los Angeles', item: 'https://sevennova.ai/kosher-rental-los-angeles' },
      ],
    },
    {
      '@type': 'RealEstateListing',
      '@id': 'https://sevennova.ai/luxury-rental#listing',
      name: '9432 Oakmore Rd — Kosher Kitchen Luxury Rental Los Angeles',
      description: 'The only luxury rental in Los Angeles with a full kosher kitchen. Gated 5-bedroom compound in Beverlywood 90035. Dual sinks, dual ovens, kosher appliances. Walking distance to Orthodox, Conservative, and Modern Orthodox synagogues on Pico Boulevard.',
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
        { '@type': 'LocationFeatureSpecification', name: 'Kosher Kitchen', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Dual Kosher Sinks', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Dual Kosher Ovens', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Kosher Appliances', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Heated Pool and Spa', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Gated Compound', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Guest House', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Walking Distance to Synagogue', value: true },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is there a kosher kitchen luxury rental in Los Angeles?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. 9432 Oakmore Rd in Beverlywood is the only luxury rental in Los Angeles with a certified kosher kitchen. The kitchen features dual sinks, dual ovens, and fully kosher appliances. The property is located in the heart of Beverlywood / Pico-Robertson, the center of Jewish life in Los Angeles.',
          },
        },
        {
          '@type': 'Question',
          name: 'What synagogues are near the kosher rental in Beverlywood?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The Beverlywood property at 9432 Oakmore Rd is walking distance to multiple synagogues including Young Israel of Century City (Orthodox), Beth Jacob Congregation (Orthodox), Congregation Magen David (Sephardic), and several Chabad houses on Pico Boulevard. The Pico-Robertson corridor has the highest concentration of synagogues in Los Angeles.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are there kosher restaurants near the Beverlywood rental?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Pico Boulevard, two blocks from the property, is lined with kosher restaurants including pizza, sushi, steakhouses, and bakeries. The 90035 zip code has more kosher restaurants per square mile than any other area of Los Angeles.',
          },
        },
        {
          '@type': 'Question',
          name: 'What does a kosher kitchen in a rental include?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The kosher kitchen at 9432 Oakmore Rd includes dual sinks (dairy and meat separation), dual ovens, a full set of kosher-designated cookware and dishes, and appliances that have not been used with non-kosher food. The kitchen is available for guests observing kashrut at all levels.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is the Beverlywood kosher rental available for Shabbat or Jewish holidays?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The Beverlywood rental is available for Shabbat and Jewish holidays. The property is within the Beverlywood eruv, and guests can walk to synagogue on Shabbat. The property is available year-round with a 30-day minimum stay.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Beverlywood inside an eruv?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Beverlywood is within the Los Angeles eruv, which covers the Pico-Robertson area. Guests observing Shabbat can carry within the eruv boundary. Confirm current eruv status at lamicha.com before your stay.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does the kosher luxury rental in Los Angeles cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The monthly rate starts at $34,999 fully furnished. This includes the main house (4BR/5BA, 4,092 sq ft) and detached guest house (1BR/1BA, ~400 sq ft). The property accommodates up to 12 guests with a heated pool, gated compound, and full kosher kitchen. 30-day minimum. Security deposit equal to one month.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is this the only kosher luxury rental in Los Angeles?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'To our knowledge, 9432 Oakmore Rd is the only gated luxury compound in Los Angeles available for monthly rental with a certified kosher kitchen, heated pool, and full guest house. Most luxury rentals in LA do not offer dedicated kosher kitchen facilities.',
          },
        },
      ],
    },
  ],
}

const kosherFeatures = [
  { icon: '🍳', label: 'Dual Ovens', desc: 'Separate meat and dairy ovens' },
  { icon: '🚿', label: 'Dual Sinks', desc: 'Meat and dairy sink separation' },
  { icon: '🥘', label: 'Kosher Cookware', desc: 'Full set of designated cookware' },
  { icon: '🍽️', label: 'Kosher Dishes', desc: 'Separate meat and dairy sets' },
  { icon: '🧊', label: 'Dual Refrigerators', desc: 'Separate refrigerator space' },
  { icon: '🧹', label: 'Never Non-Kosher', desc: 'Appliances never used otherwise' },
]

const synagogues = [
  { name: 'Young Israel of Century City', type: 'Orthodox', dist: '0.6 mi' },
  { name: 'Beth Jacob Congregation', type: 'Orthodox', dist: '0.8 mi' },
  { name: 'Congregation Magen David', type: 'Sephardic Orthodox', dist: '0.5 mi' },
  { name: 'Aish HaTorah', type: 'Orthodox', dist: '1.1 mi' },
  { name: 'Congregation Ohev Shalom', type: 'Modern Orthodox', dist: '0.7 mi' },
  { name: 'Westwood Village Synagogue', type: 'Conservative', dist: '1.5 mi' },
]

export default function KosherRentalPage() {
  return (
    <>
      <Script
        id="kosher-rental-schema"
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
          <span>Kosher Rental Los Angeles</span>
        </nav>

        {/* Hero */}
        <section style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #2d5a2d 50%, #1a3a1a 100%)', color: '#fff', padding: '80px 24px 60px', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px 16px', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', fontFamily: 'sans-serif' }}>
              The Only Kosher Luxury Rental in Los Angeles
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '400', marginBottom: '20px', lineHeight: '1.2' }}>
              Kosher Kitchen Rental<br />Los Angeles
            </h1>
            <p className="kosher-summary" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
              9432 Oakmore Rd, Beverlywood — the only luxury rental in Los Angeles with a certified kosher kitchen. Dual sinks, dual ovens, walking distance to Pico Boulevard synagogues and kosher restaurants. Gated compound, heated pool. From $34,999/month.
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

        {/* Price bar */}
        <section style={{ background: '#c9a84c', color: '#fff', padding: '16px 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <strong style={{ fontSize: '18px' }}>From $34,999/month · Beverlywood 90035 · 5BR + Guest House · Walking Distance to Synagogue</strong>
        </section>

        {/* Kosher Kitchen Features */}
        <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '12px', textAlign: 'center' }}>
            The Kosher Kitchen
          </h2>
          <p style={{ textAlign: 'center', color: '#555', fontFamily: 'sans-serif', fontSize: '15px', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            A full kosher kitchen with complete meat and dairy separation — everything guests observing kashrut need.
          </p>
          <div className="kosher-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px' }}>
            {kosherFeatures.map((f) => (
              <div key={f.label} style={{ textAlign: 'center', padding: '28px 16px', border: '1px solid #e8e8e4' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>{f.icon}</div>
                <div style={{ fontWeight: '700', fontSize: '15px', fontFamily: 'sans-serif', marginBottom: '6px' }}>{f.label}</div>
                <div style={{ fontSize: '13px', color: '#666', fontFamily: 'sans-serif' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Property Overview */}
        <section style={{ background: '#f8f8f6', padding: '60px 24px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '32px', textAlign: 'center' }}>
              The Property: 9432 Oakmore Rd, Beverlywood
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div>
                <img
                  src="/images/DJI_20250122125313_0947_D.jpg"
                  alt="Kosher Kitchen Luxury Rental Beverlywood Los Angeles 9432 Oakmore Rd"
                  style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                />
              </div>
              <div style={{ fontFamily: 'sans-serif' }}>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', marginBottom: '20px' }}>
                  A fully gated luxury compound in the heart of Beverlywood — Los Angeles&apos;s premier Jewish residential neighborhood. The property combines the main residence (4BR/5BA, 4,092 sq ft) with a detached guest house (1BR/1BA, ~400 sq ft) for a total of 5 bedrooms across two buildings.
                </p>
                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                  {[
                    ['Bedrooms', '5 total (4 main + 1 guest house)'],
                    ['Bathrooms', '6 full bathrooms'],
                    ['Kitchen', 'Full kosher — dual sinks + ovens'],
                    ['Pool', 'Heated pool + spa'],
                    ['Total Area', '4,492 sq ft combined'],
                    ['Neighborhood', 'Beverlywood 90035'],
                    ['Minimum Stay', '30 days'],
                    ['Rate', '$34,999/month'],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <td style={{ padding: '8px 0', color: '#888', width: '42%' }}>{label}</td>
                      <td style={{ padding: '8px 0', fontWeight: '600', color: '#1a1a1a' }}>{value}</td>
                    </tr>
                  ))}
                </table>
                <Link href="/luxury-rental" style={{ display: 'inline-block', marginTop: '20px', background: '#1a1a1a', color: '#fff', padding: '12px 28px', textDecoration: 'none', fontSize: '14px', fontFamily: 'sans-serif' }}>
                  Full Property Details →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Synagogue Map */}
        <section style={{ maxWidth: '960px', margin: '60px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '12px', textAlign: 'center' }}>
            Synagogues Near the Property
          </h2>
          <p style={{ textAlign: 'center', color: '#555', fontFamily: 'sans-serif', fontSize: '15px', marginBottom: '32px' }}>
            Beverlywood and Pico-Robertson have the highest concentration of synagogues in Los Angeles. All within walking distance.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontFamily: 'sans-serif' }}>
            {synagogues.map((s) => (
              <div key={s.name} style={{ padding: '20px', border: '1px solid #e8e8e4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{s.name}</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>{s.type}</div>
                </div>
                <div style={{ background: '#f0f0ec', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '12px' }}>{s.dist}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '16px', fontSize: '12px', color: '#888', fontFamily: 'sans-serif' }}>
            * Distances are approximate walking distances. Additional synagogues and Chabad houses throughout the 90035 neighborhood.
          </p>
        </section>

        {/* Pico Robertson Guide */}
        <section style={{ background: '#f8f8f6', padding: '60px 24px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '32px', textAlign: 'center' }}>
              Living in the Jewish Heart of Los Angeles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontFamily: 'sans-serif' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Pico Boulevard — Kosher Mile</h3>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', marginBottom: '16px' }}>
                  Pico Boulevard, two blocks from the property, is home to the highest concentration of kosher restaurants in Los Angeles — pizza, sushi, steakhouses, bakeries, butchers, and supermarkets. The Pico-Robertson neighborhood is the center of Jewish life in Los Angeles and has been for decades.
                </p>
                <ul style={{ fontSize: '15px', lineHeight: '1.9', color: '#444', paddingLeft: '20px' }}>
                  <li>Kosher pizza, sushi, and steakhouses within 0.3 miles</li>
                  <li>Kosher butcher shops and delis</li>
                  <li>Kosher supermarkets and markets</li>
                  <li>Kosher bakeries and cafes</li>
                  <li>Jewish bookstores and Judaica shops</li>
                </ul>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Shabbat in Beverlywood</h3>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', marginBottom: '16px' }}>
                  Beverlywood is inside the Los Angeles eruv, allowing guests observing Shabbat to carry within the neighborhood boundary. Walk to synagogue on Shabbat morning, return home for Shabbat lunch — the property is centrally located for every synagogue in the area.
                </p>
                <ul style={{ fontSize: '15px', lineHeight: '1.9', color: '#444', paddingLeft: '20px' }}>
                  <li>Inside the LA eruv</li>
                  <li>Walking distance to multiple shuls</li>
                  <li>Quiet, residential Shabbat atmosphere</li>
                  <li>Circle Park — 3 min walk</li>
                  <li>No Shabbat elevator needed (single-story property)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: '800px', margin: '60px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '400', marginBottom: '40px', textAlign: 'center' }}>
            Kosher Rental FAQ
          </h2>
          {[
            {
              q: 'Is there a kosher kitchen luxury rental in Los Angeles?',
              a: 'Yes. 9432 Oakmore Rd in Beverlywood is the only luxury rental in Los Angeles with a certified kosher kitchen — dual sinks, dual ovens, and kosher appliances. The property is in the heart of Pico-Robertson, LA\'s Jewish neighborhood.',
            },
            {
              q: 'What synagogues are near the kosher rental in Beverlywood?',
              a: 'Multiple synagogues within walking distance: Young Israel of Century City (Orthodox), Beth Jacob Congregation (Orthodox), Congregation Magen David (Sephardic), and Chabad houses on Pico Boulevard. The neighborhood has the highest concentration of synagogues in LA.',
            },
            {
              q: 'Are there kosher restaurants near the Beverlywood rental?',
              a: 'Yes. Pico Boulevard is two blocks away and has dozens of kosher restaurants — pizza, sushi, steakhouses, bakeries, and more. The 90035 zip code has more kosher restaurants per square mile than any other part of Los Angeles.',
            },
            {
              q: 'Is Beverlywood inside an eruv?',
              a: 'Yes. Beverlywood is within the Los Angeles eruv. Guests observing Shabbat can carry within the eruv boundary and walk to synagogue. Confirm current eruv status at lamicha.com before your stay.',
            },
            {
              q: 'How much does the kosher luxury rental cost?',
              a: 'From $34,999/month fully furnished. Includes the main house (4BR/5BA, 4,092 sq ft), detached guest house (1BR/1BA), heated pool and spa, and kosher kitchen. 30-day minimum. Security deposit equals one month\'s rent.',
            },
            {
              q: 'Is the kosher rental available for Passover or Jewish holidays?',
              a: 'Yes. The property is available year-round with a 30-day minimum. Guests observing Passover may arrange for the kitchen to be prepared accordingly. Contact us for Pesach availability and specific holiday dates.',
            },
            {
              q: 'Is this the only kosher luxury rental in Los Angeles?',
              a: 'To our knowledge, 9432 Oakmore Rd is the only gated luxury compound in Los Angeles available for monthly rental with a certified kosher kitchen, heated pool, and full guest house in a walkable Jewish neighborhood.',
            },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '28px', borderBottom: '1px solid #e8e8e4', paddingBottom: '28px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '10px', fontFamily: 'sans-serif' }}>{item.q}</h3>
              <p className="faq-answer" style={{ fontSize: '15px', lineHeight: '1.7', color: '#444', fontFamily: 'sans-serif', margin: '0' }}>{item.a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section style={{ background: '#1a3a1a', color: '#fff', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '16px' }}>Inquire About the Kosher Rental</h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', marginBottom: '32px', lineHeight: '1.6' }}>
              The only kosher luxury rental in Los Angeles. Inquire for availability, Passover arrangements, or holiday dates.
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
              { href: '/fifa-2026-rental-los-angeles', label: 'FIFA 2026 Rental Los Angeles', desc: '15 min to SoFi Stadium' },
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
