import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '9432 Oakmore Rd — Luxury Furnished Rental Beverlywood Los Angeles | $34,999/mo',
  description: 'Gated 5BR/6BA luxury compound in Beverlywood, Los Angeles. 4,492 sq ft, heated pool, steam sauna, full kosher kitchen, guest house, EV charging. Walking distance to shuls. FIFA 2026 available May–Aug 2026. $34,999/mo fully furnished.',
  keywords: 'luxury furnished rental Los Angeles, Beverlywood luxury rental, kosher kitchen rental LA, FIFA 2026 rental Los Angeles, luxury home rental 90035, gated compound rental Beverly Hills adjacent, Jewish neighborhood rental LA, fully furnished luxury rental Pico Robertson',
  openGraph: {
    title: '9432 Oakmore Rd — Luxury Gated Compound | Beverlywood LA | $34,999/mo',
    description: 'Gated 5BR luxury compound in Beverlywood. Heated pool, kosher kitchen, guest house. FIFA 2026 available. $34,999/mo fully furnished.',
    url: 'https://sevennova.ai/luxury-rental',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: '9432 Oakmore Rd Luxury Rental Beverlywood Los Angeles' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '9432 Oakmore Rd — Luxury Rental Beverlywood LA | $34,999/mo',
    description: 'Gated 5BR luxury compound. Heated pool, kosher kitchen, guest house. FIFA 2026 available.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/luxury-rental',
  },
}

export default function LuxuryRentalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
