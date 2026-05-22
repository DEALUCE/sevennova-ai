import Script from 'next/script'

const SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://sevennova.ai/luxury-rental/beverlywood-90035-luxury-homes-for-rent",
      "name": "Luxury Homes for Rent in Beverlywood 90035 | Los Angeles",
      "description": "Find luxury homes for rent in Beverlywood, Los Angeles 90035. Gated compounds, kosher kitchens, heated pools. FIFA 2026 available May–Aug 2026.",
      "url": "https://sevennova.ai/luxury-rental/beverlywood-90035-luxury-homes-for-rent",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": ["h1", ".neighborhood-summary", ".faq-answer", ".property-highlight"]
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sevennova.ai" },
          { "@type": "ListItem", "position": 2, "name": "Luxury Rentals", "item": "https://sevennova.ai/luxury-rental" },
          { "@type": "ListItem", "position": 3, "name": "Beverlywood 90035", "item": "https://sevennova.ai/luxury-rental/beverlywood-90035-luxury-homes-for-rent" }
        ]
      }
    },
    {
      "@type": "Neighborhood",
      "name": "Beverlywood",
      "alternateName": ["Beverly Wood", "90035"],
      "description": "Beverlywood is a quiet, prestigious residential neighborhood in Los Angeles, California, bordered by Beverly Hills to the north, Culver City to the south, and the Pico-Robertson district to the east. Known as one of LA's premier Jewish communities, Beverlywood features tree-lined streets, excellent schools, walkable access to multiple synagogues, and some of the best kosher dining in the city.",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "34.053",
        "longitude": "-118.388"
      },
      "containedInPlace": {
        "@type": "City",
        "name": "Los Angeles",
        "addressRegion": "CA"
      },
      "url": "https://sevennova.ai/luxury-rental/beverlywood-90035-luxury-homes-for-rent"
    },
    {
      "@type": "RealEstateListing",
      "name": "9432 & 9430 Oakmore Rd — Luxury Gated Compound | Beverlywood 90035",
      "description": "Gated 5-bedroom luxury compound in Beverlywood 90035. 4,492 sq ft combined, heated pool and spa, full kosher kitchen, detached guest house. FIFA 2026 available May–August 2026. $34,999/month fully furnished.",
      "url": "https://sevennova.ai/luxury-rental",
      "image": "https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "9432 Oakmore Rd",
        "addressLocality": "Los Angeles",
        "addressRegion": "CA",
        "postalCode": "90035",
        "addressCountry": "US"
      },
      "geo": { "@type": "GeoCoordinates", "latitude": "34.05303", "longitude": "-118.38756" },
      "numberOfRooms": 5,
      "floorSize": { "@type": "QuantitativeValue", "value": 4492, "unitCode": "FTK" },
      "offers": {
        "@type": "Offer",
        "price": "34999",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "priceSpecification": { "@type": "UnitPriceSpecification", "price": 34999, "priceCurrency": "USD", "unitText": "MON" }
      },
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": "Heated Pool and Spa", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Full Kosher Kitchen", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Detached Guest House", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Gated Security", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Walking Distance to Synagogue", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "FIFA 2026 World Cup Available", "value": true }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What are the best luxury homes for rent in Beverlywood 90035?",
          "acceptedAnswer": { "@type": "Answer", "text": "9432 Oakmore Rd is Beverlywood's premier luxury rental — a gated 5BR/6BA compound at $34,999/mo with heated pool, kosher kitchen, and guest house. It is one of the only fully furnished luxury compounds available in the 90035 zip code." }
        },
        {
          "@type": "Question",
          "name": "Is there a luxury rental in Beverlywood available for FIFA World Cup 2026?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. 9432 Oakmore Rd in Beverlywood is available May 15 through August 15, 2026, covering the full FIFA World Cup 2026 window in Los Angeles. The property sleeps up to 10 guests and is 15 minutes from SoFi Stadium." }
        },
        {
          "@type": "Question",
          "name": "Are there luxury rentals in Beverlywood with a kosher kitchen?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes — 9432 Oakmore Rd features a full kosher kitchen with dual sinks, dual ovens, and a gourmet island. It is located in the heart of Beverlywood, one of LA's premier Jewish neighborhoods, walking distance to multiple major shuls." }
        },
        {
          "@type": "Question",
          "name": "How much do luxury homes rent for in Beverlywood Los Angeles?",
          "acceptedAnswer": { "@type": "Answer", "text": "Luxury homes in Beverlywood 90035 typically rent from $15,000 to $45,000 per month depending on size, amenities, and furnishing. A fully furnished gated compound with pool and guest house like 9432 Oakmore Rd is priced at $34,999/month." }
        },
        {
          "@type": "Question",
          "name": "Why rent in Beverlywood instead of Beverly Hills or Bel Air?",
          "acceptedAnswer": { "@type": "Answer", "text": "Beverlywood offers Beverly Hills-adjacent luxury at 20–35% lower rental prices, with the added benefit of a walkable Jewish community, kosher restaurants, and synagogues within walking distance. The neighborhood is quieter, more residential, and has excellent schools." }
        },
        {
          "@type": "Question",
          "name": "How far is Beverlywood from SoFi Stadium for FIFA 2026?",
          "acceptedAnswer": { "@type": "Answer", "text": "Beverlywood is approximately 6 miles from SoFi Stadium in Inglewood — roughly 15–20 minutes by car or Uber. FIFA World Cup 2026 matches are scheduled at SoFi Stadium June–July 2026, making Beverlywood an ideal base for World Cup visitors." }
        },
        {
          "@type": "Question",
          "name": "What synagogues are walking distance from luxury rentals in Beverlywood?",
          "acceptedAnswer": { "@type": "Answer", "text": "Beverlywood is home to multiple synagogues within walking distance, including Young Israel of Century City, Beth Jacob Congregation, and Congregation Etz Jacob. The neighborhood is one of LA's most established Orthodox and Conservative Jewish communities." }
        },
        {
          "@type": "Question",
          "name": "How do I schedule a tour of a luxury rental in Beverlywood?",
          "acceptedAnswer": { "@type": "Answer", "text": "Contact Daniel Issak at 424-272-5935 or visit sevennova.ai/luxury-rental to schedule a private showing. Showings are by appointment only." }
        }
      ]
    }
  ]
}

const RENT_TABLE = [
  ['Studio / 1BR', '~800–1,200 sq ft', '$3,500 – $5,500'],
  ['2 Bedroom', '~1,200–1,800 sq ft', '$6,000 – $9,500'],
  ['3 Bedroom', '~1,800–2,800 sq ft', '$9,000 – $15,000'],
  ['4 Bedroom', '~2,800–4,000 sq ft', '$14,000 – $22,000'],
  ['5+ Bedroom / Compound', '4,000+ sq ft', '$22,000 – $45,000+'],
]

export default function BeverlywoodLuxuryHomes() {
  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      <Script id="schema-org" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <a href="tel:424-272-5935" style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
          📞 424-272-5935
        </a>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', height: '60vh', minHeight: '420px', overflow: 'hidden' }}>
        <img src="/images/DJI_20250122125449_0960_D.jpg" alt="Luxury home for rent in Beverlywood 90035 Los Angeles" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,14,26,1) 0%, rgba(10,14,26,0.4) 50%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 60px 48px', zIndex: 2 }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
            <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <a href="/luxury-rental" style={{ color: '#64748b', textDecoration: 'none' }}>Luxury Rentals</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <span style={{ color: '#94a3b8' }}>Beverlywood 90035</span>
          </div>
          <div style={{ display: 'inline-block', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: '100px', padding: '5px 14px', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#f5a623', marginBottom: '14px' }}>
            Beverlywood · Los Angeles 90035
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '16px', maxWidth: '750px' }}>
            Luxury Homes for Rent<br />
            <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              in Beverlywood 90035
            </span>
          </h1>
          <p className="neighborhood-summary" style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.6 }}>
            Gated compounds, kosher kitchens, heated pools — Beverly Hills adjacent, fully furnished. FIFA 2026 available May–August 2026.
          </p>
        </div>
      </section>

      {/* FEATURED PROPERTY */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 40px 0' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '8px' }}>Featured Listing</p>
        <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '32px' }}>Beverlywood's Premier Luxury Rental</h2>

        <div className="property-highlight" style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '20px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ position: 'relative', minHeight: '340px' }}>
            <img src="/images/pool-1.jpg" alt="9432 Oakmore Rd luxury rental Beverlywood" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(245,166,35,0.9)', color: '#0a0e1a', borderRadius: '8px', padding: '6px 14px', fontWeight: 800, fontSize: '13px' }}>
              ⚽ FIFA 2026 Available
            </div>
          </div>
          <div style={{ padding: '40px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>9432 & 9430 Oakmore Rd</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Beverlywood, Los Angeles CA 90035</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              {[
                ['💰', '$34,999/mo', 'Fully Furnished'],
                ['🛏', '5 Bedrooms', '6 Bathrooms'],
                ['📐', '4,492 sq ft', 'Combined'],
                ['✡️', 'Kosher Kitchen', 'Dual ovens & sinks'],
                ['🏊', 'Heated Pool', '& Spa'],
                ['🏠', 'Guest House', '~400 sq ft ADU'],
              ].map(([icon, label, sub]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{sub}</div>
                </div>
              ))}
            </div>
            <a href="/luxury-rental" style={{ display: 'block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '10px', padding: '14px 24px', fontWeight: 800, fontSize: '15px', textDecoration: 'none', textAlign: 'center' }}>
              View Full Property & Schedule Tour →
            </a>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#475569', marginTop: '10px' }}>
              Call directly: <a href="tel:424-272-5935" style={{ color: '#f5a623' }}>424-272-5935</a>
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT BEVERLYWOOD */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 40px 0' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>The Neighborhood</p>
        <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '28px' }}>Why Beverlywood 90035?</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', color: '#f5a623' }}>Beverly Hills Adjacent</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8 }}>
              Beverlywood borders Beverly Hills to the north and sits just minutes from Century City, Culver City, and the Westside. You get the prestige address and quiet residential streets without Beverly Hills rental prices.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', color: '#f5a623' }}>Premier Jewish Community</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8 }}>
              90035 is home to one of LA's most established Jewish communities, with multiple synagogues within walking distance, kosher restaurants and markets on Pico Blvd, and Circle Park — a neighborhood gathering point for families.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', color: '#f5a623' }}>FIFA 2026 World Cup Base</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8 }}>
              SoFi Stadium in Inglewood is 6 miles from Beverlywood — approximately 15 minutes by car. FIFA World Cup 2026 matches run June through July 2026, making Beverlywood an ideal luxury base for international visitors.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', color: '#f5a623' }}>Safe, Quiet, Family-Friendly</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8 }}>
              Beverlywood is one of LA's safest neighborhoods, with tree-lined residential streets, minimal traffic, and excellent public and private schools. Circle Park, a 3-minute walk, is a beloved gathering space for families.
            </p>
          </div>
        </div>
      </section>

      {/* BEVERLYWOOD VS COMPARISON */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 40px 0' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '24px' }}>Beverlywood vs. Nearby Neighborhoods</h2>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
          {[
            ['Beverlywood 90035', '$15k–$45k/mo', '✓ Kosher walkable', '✓ Quiet residential', '⭐ Best value'],
            ['Beverly Hills 90210', '$25k–$80k/mo', '✗ No kosher nearby', '✓ Prestige address', 'Most expensive'],
            ['Bel Air 90077', '$30k–$100k/mo', '✗ No kosher nearby', '✗ Isolated, car only', 'Very expensive'],
            ['Brentwood 90049', '$18k–$60k/mo', '✗ No kosher nearby', '✓ Good walkability', 'No community'],
            ['Westwood 90024', '$12k–$35k/mo', '~ Limited kosher', '✓ UCLA area', 'More transient'],
          ].map(([hood, price, kosher, vibe, note], i) => (
            <div key={hood} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1fr', padding: '14px 20px', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '13px', background: i === 0 ? 'rgba(245,166,35,0.05)' : 'transparent', alignItems: 'center' }}>
              <span style={{ fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#f5a623' : '#e2e8f0' }}>{hood}</span>
              <span style={{ color: '#94a3b8' }}>{price}</span>
              <span style={{ color: kosher.startsWith('✓') ? '#22c55e' : kosher.startsWith('~') ? '#f5a623' : '#ef4444', fontSize: '12px' }}>{kosher}</span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>{vibe}</span>
              <span style={{ color: i === 0 ? '#f5a623' : '#475569', fontSize: '11px', fontWeight: i === 0 ? 700 : 400 }}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* RENTAL MARKET */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px 0' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Market Data</p>
        <h2 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Beverlywood 90035 Rental Prices</h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Typical monthly rents for unfurnished properties. Furnished luxury properties command a 20–40% premium.</p>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>
            <span>Property Type</span><span>Size</span><span>Monthly Rent</span>
          </div>
          {RENT_TABLE.map(([type, size, rent], i) => (
            <div key={type} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', padding: '14px 20px', borderBottom: i < RENT_TABLE.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '14px', background: i === 4 ? 'rgba(245,166,35,0.04)' : 'transparent' }}>
              <span style={{ color: '#e2e8f0', fontWeight: i === 4 ? 700 : 400 }}>{type}</span>
              <span style={{ color: '#94a3b8' }}>{size}</span>
              <span style={{ color: i === 4 ? '#f5a623' : '#94a3b8', fontWeight: i === 4 ? 700 : 400 }}>{rent}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#334155', marginTop: '12px' }}>Source: Census ACS 2023 + SevenNova market analysis. Luxury furnished properties may vary.</p>
      </section>

      {/* FIFA 2026 SECTION */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px 0' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(249,212,35,0.04))', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '20px', padding: '40px' }}>
          <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>⚽ FIFA World Cup 2026</p>
          <h2 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px' }}>The Perfect FIFA 2026 Base</h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '24px' }}>
            Los Angeles is hosting FIFA World Cup 2026 matches at SoFi Stadium in Inglewood. Beverlywood sits just 6 miles — 15 minutes — from the stadium. With luxury compounds sleeping up to 10 guests, a gated compound in 90035 is the ideal base for visiting teams, executives, and international fans who need privacy, space, and kosher access.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
            {[
              ['📍', '6 miles', 'from SoFi Stadium'],
              ['⏱', '~15 min', 'by car/rideshare'],
              ['🗓', 'May 15–Aug 15', '2026 Available'],
              ['👥', 'Sleeps 10', 'Main + Guest House'],
              ['✡️', 'Kosher Kitchen', 'Full setup'],
              ['🔒', 'Gated + Private', 'Full security'],
            ].map(([icon, val, label]) => (
              <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#f5a623' }}>{val}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
              </div>
            ))}
          </div>
          <a href="/luxury-rental" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '10px', padding: '14px 28px', fontWeight: 800, fontSize: '15px', textDecoration: 'none' }}>
            Check FIFA 2026 Availability →
          </a>
        </div>
      </section>

      {/* KOSHER + SYNAGOGUE */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px 0' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>Jewish Community</p>
        <h2 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '20px' }}>Kosher Living in Beverlywood 90035</h2>
        <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '28px' }}>
          Beverlywood is Los Angeles's most walkable Jewish neighborhood. 9432 Oakmore Rd is the only luxury rental compound in the area featuring a full kosher kitchen — dual sinks, dual ovens, and a professional-grade island setup. Within a 10-minute walk you'll find multiple Orthodox and Conservative synagogues, Circle Park, and some of LA's best kosher dining on Pico Blvd.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { icon: '🕍', title: 'Synagogues in Walking Distance', text: 'Young Israel of Century City, Beth Jacob Congregation, Congregation Etz Jacob — all within 10 minutes on foot.' },
            { icon: '🍽', title: 'Kosher Restaurants on Pico Blvd', text: 'Pico Blvd is LA\'s main kosher restaurant corridor — meat, dairy, sushi, pizza, and bakeries all within 5 minutes.' },
            { icon: '🛒', title: 'Kosher Markets', text: 'Glatt Mart, Jerusalem Glatt Kosher, and multiple specialty shops serving the Beverlywood community.' },
            { icon: '🌳', title: 'Circle Park — 3 Min Walk', text: 'The neighborhood\'s beloved park and shabbat gathering spot for families. Dog-friendly, playground, wide lawns.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 40px' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>FAQ</p>
        <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', textAlign: 'center', marginBottom: '48px' }}>Beverlywood Luxury Rental Questions</h2>
        {[
          { q: 'What are the best luxury homes for rent in Beverlywood 90035?', a: '9432 Oakmore Rd is Beverlywood\'s premier luxury rental — a gated 5BR/6BA compound at $34,999/mo with heated pool, kosher kitchen, and guest house. It is one of the only fully furnished luxury compounds available in the 90035 zip code.' },
          { q: 'Is there a luxury rental in Beverlywood available for FIFA World Cup 2026?', a: 'Yes. 9432 Oakmore Rd in Beverlywood is available May 15 through August 15, 2026. The property sleeps up to 10 guests and is 15 minutes from SoFi Stadium where FIFA World Cup 2026 matches are held.' },
          { q: 'Are there luxury rentals in Beverlywood with a kosher kitchen?', a: 'Yes — 9432 Oakmore Rd features a full kosher kitchen with dual sinks, dual ovens, and a gourmet island. It is the only luxury rental compound in Beverlywood with a certified kosher kitchen setup.' },
          { q: 'How much do luxury homes rent for in Beverlywood?', a: 'Luxury homes in Beverlywood 90035 range from $15,000 to $45,000/month depending on size and amenities. A fully furnished gated compound with pool and guest house like 9432 Oakmore Rd is priced at $34,999/month.' },
          { q: 'Why rent in Beverlywood instead of Beverly Hills?', a: 'Beverlywood offers Beverly Hills-adjacent luxury at 20–35% lower rental prices, with walkable access to synagogues, kosher restaurants, and Circle Park. The neighborhood is quieter, more residential, and better suited to families and longer-term stays.' },
          { q: 'How far is Beverlywood from SoFi Stadium for FIFA 2026?', a: 'Beverlywood is approximately 6 miles from SoFi Stadium in Inglewood — roughly 15–20 minutes by car or rideshare. FIFA World Cup 2026 matches run June–July 2026.' },
          { q: 'What synagogues are walking distance in Beverlywood?', a: 'Young Israel of Century City, Beth Jacob Congregation, and Congregation Etz Jacob are among the synagogues within a 10-minute walk of 9432 Oakmore Rd in Beverlywood.' },
          { q: 'How do I schedule a tour of a luxury rental in Beverlywood?', a: 'Contact Daniel Issak at 424-272-5935 or visit sevennova.ai/luxury-rental to schedule a private showing. Showings are by appointment only.' },
        ].map((item, i) => (
          <div key={i} className="faq-answer" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '24px 0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px' }}>{item.q}</h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.8 }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* RELATED PAGES */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 40px 80px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '24px' }}>Related Luxury Rental Pages</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { href: '/luxury-rental', label: '9432 Oakmore Rd', sub: 'Full property listing' },
            { href: '/fifa-2026-rental-los-angeles', label: 'FIFA 2026 Rentals LA', sub: 'World Cup accommodation' },
            { href: '/kosher-rental-los-angeles', label: 'Kosher Rental LA', sub: 'Kosher kitchen properties' },
            { href: '/luxury-rental-90035', label: 'Luxury Rental 90035', sub: 'Zip code guide' },
          ].map(link => (
            <a key={link.href} href={link.href} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px', textDecoration: 'none', transition: 'border-color 0.2s' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5a623', marginBottom: '4px' }}>{link.label}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>{link.sub}</div>
            </a>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px', textAlign: 'center' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '12px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </a>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · Luxury Rentals · The Issak Group · DRE #02037760 · DRE #01869619</p>
      </footer>
    </div>
  )
}
