import Script from 'next/script'
import Link from 'next/link'

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://sevennova.ai/beverlywood-luxury-rental',
      url: 'https://sevennova.ai/beverlywood-luxury-rental',
      name: 'Beverlywood Luxury Rental | Gated 5BR Compound $34,999/mo',
      description: 'Luxury rental in Beverlywood, Los Angeles. Gated 5BR/6BA compound with heated pool, kosher kitchen, and guest house. Beverly Hills adjacent.',
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.speakable'],
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevennova.ai' },
        { '@type': 'ListItem', position: 2, name: 'Luxury Rental', item: 'https://sevennova.ai/luxury-rental' },
        { '@type': 'ListItem', position: 3, name: 'Beverlywood Luxury Rental', item: 'https://sevennova.ai/beverlywood-luxury-rental' },
      ],
    },
    {
      '@type': 'RealEstateListing',
      name: 'Beverlywood Luxury Rental — 9432 Oakmore Rd, Los Angeles CA 90035',
      description: 'Gated 5BR/6BA luxury compound in Beverlywood with heated pool, steam sauna, kosher kitchen, and detached guest house. Beverly Hills adjacent, fully furnished. Available from $34,999/mo.',
      url: 'https://sevennova.ai/luxury-rental',
      image: [
        'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg',
        'https://sevennova.ai/images/pool-1.jpg',
        'https://sevennova.ai/images/kitchen-1.jpg',
      ],
      address: {
        '@type': 'PostalAddress',
        streetAddress: '9432 Oakmore Rd',
        addressLocality: 'Los Angeles',
        addressRegion: 'CA',
        postalCode: '90035',
        addressCountry: 'US',
      },
      geo: { '@type': 'GeoCoordinates', latitude: '34.05303', longitude: '-118.38756' },
      numberOfRooms: 5,
      floorSize: { '@type': 'QuantitativeValue', value: 4492, unitCode: 'FTK' },
      offers: {
        '@type': 'Offer',
        price: 34999,
        priceCurrency: 'USD',
        priceSpecification: { '@type': 'UnitPriceSpecification', price: 34999, priceCurrency: 'USD', unitText: 'MON' },
      },
      broker: {
        '@type': 'RealEstateAgent',
        name: 'Daniel Issak',
        telephone: '424-272-5935',
        email: 'info@sevennova.ai',
      },
    },
    {
      '@type': 'Neighborhood',
      name: 'Beverlywood',
      description: 'Beverlywood is a residential neighborhood in West Los Angeles, ZIP 90035, known for its large Orthodox and Modern Orthodox Jewish community, walkability to Pico Boulevard kosher restaurants, and Beverly Hills adjacency.',
      geo: { '@type': 'GeoCoordinates', latitude: '34.0530', longitude: '-118.3876' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What luxury rentals are available in Beverlywood?',
          acceptedAnswer: { '@type': 'Answer', text: '9432 Oakmore Rd is the premier luxury rental in Beverlywood — a gated 5BR/6BA compound with heated pool, steam sauna, kosher kitchen, and detached guest house. Available fully furnished from $34,999/mo with a 30-day minimum.' },
        },
        {
          '@type': 'Question',
          name: 'Where is Beverlywood located?',
          acceptedAnswer: { '@type': 'Answer', text: 'Beverlywood is in West Los Angeles, ZIP code 90035. Bounded by Olympic Blvd (north), Pico Blvd (south), Robertson Blvd (east), and Beverwil Dr (west). It is 5 minutes from Beverly Hills and 15 minutes from SoFi Stadium.' },
        },
        {
          '@type': 'Question',
          name: 'Is Beverlywood a Jewish neighborhood?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Beverlywood is home to one of the largest Orthodox and Modern Orthodox Jewish communities in the United States. The neighborhood is inside the Los Angeles eruv, and Pico Boulevard (2 blocks from the property) has the highest concentration of kosher restaurants in LA.' },
        },
        {
          '@type': 'Question',
          name: 'How much does a luxury rental in Beverlywood cost?',
          acceptedAnswer: { '@type': 'Answer', text: 'Luxury rentals in Beverlywood range from $22,000–$50,000+/month for 5+ bedroom properties. 9432 Oakmore Rd is priced at $34,999/mo fully furnished — a gated 5BR/6BA compound with pool, guest house, and kosher kitchen.' },
        },
      ],
    },
  ],
}

export default function BeverlywoodLuxuryRental() {
  return (
    <>
      <Script
        id="beverlywood-luxury-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="relative bg-gray-900 text-white py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-sm text-yellow-400 uppercase tracking-widest mb-3 font-medium">
              Beverlywood · Los Angeles CA 90035
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 speakable">
              Beverlywood Luxury Rental
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl speakable">
              The only gated luxury compound in Beverlywood available for monthly rental.
              5 bedrooms, heated pool, kosher kitchen — Beverly Hills adjacent from $34,999/mo.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/luxury-rental" className="bg-yellow-500 text-black px-6 py-3 rounded font-semibold hover:bg-yellow-400 transition">
                View Property →
              </Link>
              <a href="tel:4242725935" className="border border-white text-white px-6 py-3 rounded font-semibold hover:bg-white hover:text-black transition">
                Call 424-272-5935
              </a>
            </div>
          </div>
        </section>

        {/* Property card */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-2">9432 Oakmore Rd — Beverlywood's Premier Luxury Rental</h2>
            <p className="text-gray-500 mb-10">The only gated compound available for monthly rental in Beverlywood, Los Angeles 90035</p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                { label: 'Bedrooms', value: '5 BR / 6 BA' },
                { label: 'Living Space', value: '4,492 sq ft' },
                { label: 'Monthly Rate', value: '$34,999/mo' },
                { label: 'Guest House', value: '~400 sq ft' },
                { label: 'Pool', value: 'Heated Pool + Spa' },
                { label: 'Minimum Stay', value: '30 days' },
              ].map(({ label, value }) => (
                <div key={label} className="border border-gray-200 rounded-lg p-5">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-lg font-semibold">{value}</div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4">Property Features</h3>
            <ul className="grid md:grid-cols-2 gap-2 text-gray-700 mb-12">
              {[
                'Gated compound — 2 structures on one lot',
                'Heated pool and spa',
                'Steam sauna',
                'Chef\'s kitchen with dual sinks + dual ovens',
                'Certified kosher kitchen',
                'Detached guest house (~400 sq ft)',
                'EV charging station',
                'Smart home system',
                'Luxury curated furnishings',
                'Walking distance to Pico Blvd synagogues',
                'Beverly Hills adjacent (5 min drive)',
                'Available May 15 – Aug 15, 2026 (FIFA)',
              ].map(f => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* About Beverlywood */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">About Beverlywood, Los Angeles 90035</h2>
            <div className="prose max-w-none text-gray-700 space-y-4">
              <p className="speakable">
                Beverlywood is a residential neighborhood in West Los Angeles with ZIP code 90035.
                Bordered by Olympic Blvd to the north, Pico Blvd to the south, Robertson Blvd to the east,
                and Beverwil Drive to the west, it sits directly adjacent to Beverly Hills — just a 5-minute drive to Rodeo Drive.
              </p>
              <p>
                The neighborhood is home to one of the largest Orthodox and Modern Orthodox Jewish communities
                in the United States. Pico Boulevard, 2 blocks south, has the highest concentration of kosher
                restaurants in Los Angeles — including pizza, sushi, steakhouse, bakery, and butcher shops all within walking distance.
              </p>
              <p>
                Beverlywood is inside the Los Angeles eruv, allowing carrying on Shabbat. Six synagogues are
                within walking distance of 9432 Oakmore Rd, including Young Israel of Century City, Beth Jacob
                Congregation, and multiple Chabad houses.
              </p>
            </div>

            {/* Rental market table */}
            <h3 className="text-xl font-bold mt-10 mb-4">Beverlywood Luxury Rental Market (90035)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="text-left p-3">Property Size</th>
                    <th className="text-left p-3">Monthly Range</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    ['2 Bedroom', '$5,000 – $8,000/mo', 'Condo or townhome'],
                    ['3 Bedroom', '$8,000 – $14,000/mo', 'Single family'],
                    ['4 Bedroom', '$14,000 – $22,000/mo', 'Single family with pool'],
                    ['5 Bedroom+', '$22,000 – $50,000+/mo', 'Large compound or estate'],
                    ['9432 Oakmore Rd (5BR gated compound)', '$34,999/mo', '✓ Kosher kitchen + guest house + pool'],
                  ].map(([size, price, note]) => (
                    <tr key={size} className={size.includes('9432') ? 'bg-yellow-50 font-semibold' : ''}>
                      <td className="p-3">{size}</td>
                      <td className="p-3">{price}</td>
                      <td className="p-3 text-gray-600">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-10">Frequently Asked Questions — Beverlywood Luxury Rental</h2>
            <div className="space-y-8">
              {[
                {
                  q: 'What luxury rentals are available in Beverlywood?',
                  a: '9432 Oakmore Rd is the premier luxury rental in Beverlywood — a gated 5BR/6BA compound with heated pool, steam sauna, certified kosher kitchen, and detached guest house. Available fully furnished from $34,999/mo with a 30-day minimum stay.',
                },
                {
                  q: 'Is Beverlywood inside the Los Angeles eruv?',
                  a: 'Yes. Beverlywood is within the Los Angeles eruv, which allows carrying on Shabbat. The neighborhood is home to one of the largest Orthodox Jewish communities in the US, with 6+ synagogues within walking distance.',
                },
                {
                  q: 'How close is Beverlywood to Beverly Hills?',
                  a: 'Beverlywood is directly adjacent to Beverly Hills — approximately 5 minutes by car to Rodeo Drive and the Beverly Hills business district. The neighborhood shares the same character and property values as Beverly Hills at a fraction of the cost.',
                },
                {
                  q: 'Is the Beverlywood rental available for FIFA World Cup 2026?',
                  a: '9432 Oakmore Rd is available for the full FIFA World Cup 2026 window (May 15 – August 15, 2026). SoFi Stadium, the FIFA 2026 LA venue, is 15 minutes from the property. The compound accommodates up to 12 guests.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-l-4 border-yellow-500 pl-6">
                  <h3 className="font-semibold text-lg mb-2">{q}</h3>
                  <p className="text-gray-600">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-gray-900 text-white text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Schedule a Private Showing</h2>
            <p className="text-gray-300 mb-8">Beverlywood's only gated luxury compound available for monthly rental. Response within 24 hours guaranteed.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/luxury-rental" className="bg-yellow-500 text-black px-8 py-3 rounded font-semibold hover:bg-yellow-400 transition">
                View Full Listing
              </Link>
              <a href="tel:4242725935" className="border border-white text-white px-8 py-3 rounded font-semibold hover:bg-white hover:text-black transition">
                424-272-5935
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-6">Daniel Issak · DRE #02037760 · The Issak Group</p>
          </div>
        </section>

        {/* Internal links */}
        <section className="py-12 px-6 bg-white border-t">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Related Pages</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/luxury-rental" className="text-blue-600 hover:underline">Main Property Listing</Link>
              <Link href="/kosher-rental-los-angeles" className="text-blue-600 hover:underline">Kosher Kitchen Rental LA</Link>
              <Link href="/fifa-2026-rental-los-angeles" className="text-blue-600 hover:underline">FIFA 2026 Rental LA</Link>
              <Link href="/luxury-rental/beverlywood-90035-luxury-homes-for-rent" className="text-blue-600 hover:underline">Beverlywood 90035 Luxury Homes</Link>
              <Link href="/luxury-rental-90035" className="text-blue-600 hover:underline">Luxury Rental 90035</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
