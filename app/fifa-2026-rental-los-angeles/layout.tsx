import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FIFA 2026 Luxury Rental Los Angeles | Beverlywood | From $34,999/mo',
  description: 'Premium FIFA World Cup 2026 rental in Los Angeles. 5BR gated luxury compound in Beverlywood, 15 min from SoFi Stadium. Kosher kitchen, heated pool, fully furnished from $34,999/mo.',
  keywords: 'FIFA 2026 rental Los Angeles, World Cup 2026 accommodation LA, FIFA World Cup luxury rental, SoFi Stadium rental, FIFA 2026 housing Los Angeles, luxury rental near SoFi Stadium, World Cup 2026 rental Beverly Hills area, FIFA 2026 furnished rental LA',
  openGraph: {
    title: 'FIFA World Cup 2026 Luxury Rental Los Angeles | 5BR Gated Compound',
    description: 'Gated 5BR luxury compound in Beverlywood — 15 min to SoFi Stadium. Kosher kitchen, heated pool, fully furnished. Available May–Aug 2026 for FIFA World Cup.',
    url: 'https://sevennova.ai/fifa-2026-rental-los-angeles',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: 'FIFA 2026 Luxury Rental Los Angeles Beverlywood' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIFA 2026 Luxury Rental Los Angeles | From $34,999/mo',
    description: 'Gated 5BR compound, 15 min to SoFi Stadium. Heated pool, kosher kitchen. Available May–Aug 2026.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/fifa-2026-rental-los-angeles',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
