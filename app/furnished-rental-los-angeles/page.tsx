import Script from 'next/script'
import Link from 'next/link'

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://sevennova.ai/furnished-rental-los-angeles',
      url: 'https://sevennova.ai/furnished-rental-los-angeles',
      name: 'Furnished Rental Los Angeles | Luxury 5BR | $34,999/mo',
      description: 'Fully furnished luxury rental in Los Angeles. Gated 5BR/6BA compound in Beverlywood with heated pool, kosher kitchen, and guest house.',
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
        { '@type': 'ListItem', position: 3, name: 'Furnished Rental Los Angeles', item: 'https://sevennova.ai/furnished-rental-los-angeles' },
      ],
    },
    {
      '@type': 'RealEstateListing',
      name: 'Furnished Rental Los Angeles — 9432 Oakmore Rd, Beverlywood CA 90035',
      description: 'Fully furnished gated 5BR/6BA luxury compound in Beverlywood, Los Angeles. Luxury curated furnishings, heated pool and spa, steam sauna, certified kosher kitchen, detached guest house. Move-in ready from $34,999/mo.',
      url: 'https://sevennova.ai/luxury-rental',
      image: [
        'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg',
        'https://sevennova.ai/images/living-1.jpg',
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
        description: 'Fully furnished. 30-day minimum.',
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
          name: 'What is the best fully furnished luxury rental in Los Angeles?',
          acceptedAnswer: { '@type': 'Answer', text: '9432 Oakmore Rd in Beverlywood is the premier fully furnished luxury rental in Los Angeles — a gated 5BR/6BA compound with luxury curated furnishings, heated pool, kosher kitchen, and guest house. Beverly Hills adjacent, available from $34,999/mo.' },
        },
        {
          '@type': 'Question',
          name: 'What is included in a fully furnished luxury rental in LA?',
          acceptedAnswer: { '@type': 'Answer', text: '9432 Oakmore Rd comes fully furnished with luxury curated furnishings throughout: bedroom sets, living room furniture, dining room, fully equipped chef\'s kitchen with cookware and dishes, linens, and all appliances. Move-in ready from day one.' },
        },
        {
          '@type': 'Question',
          name: 'How much does a furnished rental in Los Angeles cost?',
          acceptedAnswer: { '@type': 'Answer', text: 'Furnished luxury rentals in Los Angeles range from $10,000–$60,000+/month depending on size and neighborhood. 9432 Oakmore Rd is priced at $34,999/mo fully furnished — a 5BR/6BA gated compound with pool, guest house, and kosher kitchen in Beverly Hills adjacent Beverlywood.' },
        },
        {
          '@type': 'Question',
          name: 'Is the furnished rental available for short-term stays?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. 9432 Oakmore Rd is available with a 30-day minimum stay. It is fully available for the FIFA World Cup 2026 window (May 15 – August 15, 2026) and for Passover, Jewish holidays, and extended corporate stays.' },
        },
      ],
    },
  ],
}

const furnishings = [
  { room: 'Primary Suite', items: 'King bed, luxury linens, walk-in closet, spa bath with steam sauna' },
  { room: 'Guest Bedrooms (4)', items: 'Queen and twin beds, dressers, closets, luxury linens' },
  { room: 'Guest House', items: 'Full bedroom, private bathroom, kitchenette — 100% private' },
  { room: 'Living Room', items: 'Designer sofas, coffee tables, entertainment system, fireplace' },
  { room: 'Dining Room', items: 'Formal dining table seats 8+, full place settings' },
  { room: "Chef's Kitchen", items: 'All appliances, cookware, knives, coffee maker, dual ovens, dual sinks (kosher)' },
  { room: 'Outdoor', items: 'Patio furniture, pool lounge chairs, dining set, BBQ grill' },
  { room: 'Office/Flex', items: 'Desk, chair, high-speed WiFi throughout' },
]

export default function FurnishedRentalLosAngeles() {
  return (
    <>
      <Script
        id="furnished-rental-la-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gray-900 text-white py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="inline-block bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded uppercase tracking-wide mb-4">
              Move-In Ready · Fully Furnished
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 speakable">
              Furnished Rental Los Angeles
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl speakable">
              Luxury curated furnishings throughout. Gated 5BR/6BA compound in Beverlywood —
              heated pool, kosher kitchen, guest house. Arrive with a suitcase. From $34,999/mo.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/luxury-rental" className="bg-yellow-500 text-black px-6 py-3 rounded font-semibold hover:bg-yellow-400 transition">
                View Property & Photos →
              </Link>
              <a href="tel:4242725935" className="border border-white text-white px-6 py-3 rounded font-semibold hover:bg-white hover:text-black transition">
                424-272-5935
              </a>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-2">What's Included — Fully Furnished</h2>
            <p className="text-gray-500 mb-10">Every room furnished and equipped. Move-in ready from day one.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="text-left p-3">Room</th>
                    <th className="text-left p-3">What's Included</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {furnishings.map(({ room, items }) => (
                    <tr key={room} className="hover:bg-gray-50">
                      <td className="p-3 font-medium whitespace-nowrap">{room}</td>
                      <td className="p-3 text-gray-600">{items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Why LA furnished rentals */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Why Choose a Furnished Rental in Los Angeles?</h2>
            <div className="grid md:grid-cols-2 gap-8 text-gray-700">
              <div>
                <h3 className="font-bold text-lg mb-3">Perfect For</h3>
                <ul className="space-y-2">
                  {[
                    'FIFA World Cup 2026 delegations (May–Aug 2026)',
                    'Corporate relocations and extended business stays',
                    'Production and entertainment industry housing',
                    'Jewish community — Passover, holidays, Shabbat',
                    'International families visiting LA for extended stays',
                    'Medical travel (Cedars-Sinai, UCLA Medical nearby)',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3">9432 Oakmore Rd Advantages</h3>
                <ul className="space-y-2">
                  {[
                    'Only gated luxury compound in Beverlywood for monthly rental',
                    'Only luxury rental in LA with certified kosher kitchen',
                    'Beverly Hills adjacent — 5 min to Rodeo Drive',
                    '15 min to SoFi Stadium (FIFA 2026 venue)',
                    'Walking distance to 6+ synagogues',
                    'Private guest house on same gated lot',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Pricing & Availability</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { label: 'Monthly Rate', value: '$34,999', sub: 'Fully furnished' },
                { label: 'Security Deposit', value: '$34,999', sub: 'Refundable' },
                { label: 'Minimum Stay', value: '30 days', sub: 'Flexible on longer stays' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-sm text-gray-500 mb-1">{label}</div>
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="text-xs text-gray-400 mt-1">{sub}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-6 text-sm">
              Available: <strong>May 15 – August 15, 2026</strong> (FIFA World Cup window) and select dates before/after.
              Contact us for exact availability.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-10">FAQ — Furnished Rental Los Angeles</h2>
            <div className="space-y-8">
              {[
                {
                  q: 'What is the best fully furnished luxury rental in Los Angeles?',
                  a: '9432 Oakmore Rd in Beverlywood is LA\'s premier fully furnished luxury rental — a gated 5BR/6BA compound with luxury curated furnishings, heated pool, certified kosher kitchen, and private guest house. Beverly Hills adjacent, from $34,999/mo.',
                },
                {
                  q: 'How much does a furnished rental in Los Angeles cost per month?',
                  a: 'Fully furnished luxury rentals in LA range from $10,000–$60,000+/month. 9432 Oakmore Rd is $34,999/mo for a 5BR/6BA gated compound with pool and guest house — an exceptional value for the size, location, and amenities.',
                },
                {
                  q: 'Is the furnished rental available for Passover or Jewish holidays?',
                  a: 'Yes. The property features a certified kosher kitchen with dual sinks and dual ovens, never used with non-kosher food. Beverlywood is inside the Los Angeles eruv. The property is suitable for Passover, Shabbat, and all Jewish holidays.',
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
            <h2 className="text-3xl font-bold mb-4">Inquire About This Furnished Rental</h2>
            <p className="text-gray-300 mb-8">Move-in ready. Luxury curated furnishings. 30-day minimum. 24-hour response guaranteed.</p>
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
              <Link href="/luxury-rental-90035" className="text-blue-600 hover:underline">Luxury Rental 90035</Link>
              <Link href="/kosher-rental-los-angeles" className="text-blue-600 hover:underline">Kosher Kitchen Rental LA</Link>
              <Link href="/fifa-2026-rental-los-angeles" className="text-blue-600 hover:underline">FIFA 2026 Rental LA</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
