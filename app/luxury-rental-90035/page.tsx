import Script from 'next/script'
import Link from 'next/link'

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://sevennova.ai/luxury-rental-90035',
      url: 'https://sevennova.ai/luxury-rental-90035',
      name: 'Luxury Rental 90035 | Beverlywood | Gated 5BR $34,999/mo',
      description: 'Luxury rental in Los Angeles ZIP code 90035. Gated 5BR/6BA compound with heated pool, kosher kitchen, and guest house in Beverlywood.',
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
        { '@type': 'ListItem', position: 3, name: 'Luxury Rental 90035', item: 'https://sevennova.ai/luxury-rental-90035' },
      ],
    },
    {
      '@type': 'RealEstateListing',
      name: 'Luxury Rental 90035 — 9432 Oakmore Rd, Los Angeles CA 90035',
      description: 'Gated 5BR/6BA luxury compound in Beverly Hills adjacent Beverlywood (90035). Heated pool, steam sauna, certified kosher kitchen, detached guest house. Fully furnished from $34,999/mo.',
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
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What luxury homes are available for rent in 90035?',
          acceptedAnswer: { '@type': 'Answer', text: '9432 Oakmore Rd is a gated 5BR/6BA compound in the 90035 zip code (Beverlywood). Features include 4,492 sq ft of living space, heated pool and spa, steam sauna, certified kosher kitchen, and a detached guest house. Available fully furnished from $34,999/mo with a 30-day minimum.' },
        },
        {
          '@type': 'Question',
          name: 'What neighborhood is the 90035 zip code?',
          acceptedAnswer: { '@type': 'Answer', text: 'ZIP code 90035 covers Beverlywood and parts of Pico-Robertson in West Los Angeles. It is directly adjacent to Beverly Hills (5 min drive), known for its large Jewish community, walkability to Pico Blvd kosher restaurants, and high-end residential character.' },
        },
        {
          '@type': 'Question',
          name: 'How much does a luxury rental cost in the 90035 zip code?',
          acceptedAnswer: { '@type': 'Answer', text: 'Luxury rentals in 90035 range from $8,000–$50,000+/month depending on size. 5-bedroom luxury homes typically rent from $22,000–$50,000/month. 9432 Oakmore Rd is priced at $34,999/mo — a gated compound with pool, kosher kitchen, and guest house.' },
        },
        {
          '@type': 'Question',
          name: 'Is 90035 a good neighborhood for short-term luxury rental?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. The 90035 zip code (Beverlywood / Pico-Robertson) is ideal for short-term luxury rental — Beverly Hills adjacent, walkable to Pico Blvd restaurants and synagogues, inside the LA eruv, and 15 minutes from SoFi Stadium for FIFA World Cup 2026.' },
        },
      ],
    },
  ],
}

const rentalStats = [
  { label: '2BR', range: '$5,000–$8,000/mo' },
  { label: '3BR', range: '$8,000–$14,000/mo' },
  { label: '4BR', range: '$14,000–$22,000/mo' },
  { label: '5BR+', range: '$22,000–$50,000+/mo' },
]

export default function LuxuryRental90035() {
  return (
    <>
      <Script
        id="luxury-rental-90035-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gray-900 text-white py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-sm text-yellow-400 uppercase tracking-widest mb-3 font-medium">
              ZIP Code 90035 · Beverlywood · Los Angeles
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 speakable">
              Luxury Rental — 90035 Zip Code
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl speakable">
              Gated 5BR/6BA compound in Beverlywood, Los Angeles 90035.
              4,492 sq ft, heated pool, certified kosher kitchen. Fully furnished from $34,999/mo.
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

        {/* ZIP 90035 overview */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">About ZIP Code 90035 — Beverlywood, Los Angeles</h2>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="text-gray-700 space-y-4">
                <p className="speakable">
                  ZIP code 90035 covers Beverlywood and portions of the Pico-Robertson neighborhood in
                  West Los Angeles. The area is directly adjacent to Beverly Hills — just a 5-minute drive
                  to Rodeo Drive — and is known for its residential character, walkability, and large Orthodox Jewish community.
                </p>
                <p>
                  Pico Boulevard forms the southern boundary of 90035 and has the highest concentration
                  of kosher restaurants in Los Angeles. The neighborhood is inside the Los Angeles eruv,
                  allowing carrying on Shabbat. Six synagogues are within walking distance of 9432 Oakmore Rd.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">90035 Zip Code Facts</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    ['Neighborhood', 'Beverlywood / Pico-Robertson'],
                    ['City', 'Los Angeles, CA'],
                    ['Adjacent to', 'Beverly Hills (5 min drive)'],
                    ['Distance to SoFi', '~15 minutes'],
                    ['Eruv', 'Yes — inside Los Angeles eruv'],
                    ['Kosher restaurants', 'Pico Blvd (2 blocks)'],
                    ['School district', 'LAUSD / Beverly Hills USD nearby'],
                  ].map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Rental market */}
            <h3 className="text-xl font-bold mt-12 mb-4">90035 Luxury Rental Market</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="text-left p-3">Size</th>
                    <th className="text-left p-3">Monthly Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rentalStats.map(({ label, range }) => (
                    <tr key={label}>
                      <td className="p-3">{label}</td>
                      <td className="p-3">{range}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-50 font-semibold">
                    <td className="p-3">9432 Oakmore Rd (5BR gated compound)</td>
                    <td className="p-3">$34,999/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Property */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-2">Featured: 9432 Oakmore Rd</h2>
            <p className="text-gray-500 mb-8">The premier luxury rental available in 90035</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: '🛏', label: '5 Bedrooms / 6 Bathrooms' },
                { icon: '📐', label: '4,492 sq ft combined' },
                { icon: '🏊', label: 'Heated pool + spa' },
                { icon: '🧖', label: 'Steam sauna' },
                { icon: '🔑', label: 'Gated compound' },
                { icon: '🏠', label: 'Detached guest house' },
                { icon: '✡️', label: 'Certified kosher kitchen' },
                { icon: '⚡', label: 'EV charging station' },
                { icon: '💰', label: '$34,999/mo fully furnished' },
              ].map(({ icon, label }) => (
                <div key={label} className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-sm">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/luxury-rental" className="inline-block bg-gray-900 text-white px-8 py-3 rounded font-semibold hover:bg-gray-800 transition">
                View Full Listing & Photos →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-10">FAQ — Luxury Rental in 90035</h2>
            <div className="space-y-8">
              {[
                {
                  q: 'What luxury homes are available for rent in 90035?',
                  a: '9432 Oakmore Rd is a gated 5BR/6BA compound at 4,492 sq ft in the 90035 zip code. It features a heated pool, steam sauna, certified kosher kitchen, and detached guest house. Available fully furnished from $34,999/mo.',
                },
                {
                  q: 'Is 90035 the same as Beverlywood?',
                  a: 'Yes. ZIP code 90035 primarily covers Beverlywood and parts of Pico-Robertson. Beverlywood is a residential neighborhood in West Los Angeles, directly adjacent to Beverly Hills.',
                },
                {
                  q: 'How far is 90035 from SoFi Stadium?',
                  a: 'Approximately 15 minutes from the 90035 zip code to SoFi Stadium in Inglewood via La Cienega Blvd — making it a prime location for FIFA World Cup 2026 housing.',
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
            <h2 className="text-3xl font-bold mb-4">Inquire About 9432 Oakmore Rd</h2>
            <p className="text-gray-300 mb-8">The only gated luxury compound available for monthly rental in ZIP code 90035. 24-hour response guaranteed.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/luxury-rental" className="bg-yellow-500 text-black px-8 py-3 rounded font-semibold hover:bg-yellow-400 transition">
                View Full Listing
              </Link>
              <a href="tel:4242725935" className="border border-white text-white px-8 py-3 rounded font-semibold hover:bg-white hover:text-black transition">
                424-272-5935
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-6">Daniel Issak · DRE #02037760 · info@sevennova.ai</p>
          </div>
        </section>

        <section className="py-12 px-6 bg-white border-t">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Related Pages</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/luxury-rental" className="text-blue-600 hover:underline">Main Property Listing</Link>
              <Link href="/beverlywood-luxury-rental" className="text-blue-600 hover:underline">Beverlywood Luxury Rental</Link>
              <Link href="/kosher-rental-los-angeles" className="text-blue-600 hover:underline">Kosher Kitchen Rental LA</Link>
              <Link href="/fifa-2026-rental-los-angeles" className="text-blue-600 hover:underline">FIFA 2026 Rental LA</Link>
              <Link href="/luxury-rental/beverlywood-90035-luxury-homes-for-rent" className="text-blue-600 hover:underline">Beverlywood 90035 Luxury Homes</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
