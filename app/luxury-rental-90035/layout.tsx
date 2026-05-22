import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Luxury Rental 90035 | Beverlywood | Gated 5BR $34,999/mo',
  description: 'Luxury rental in Los Angeles ZIP code 90035. Gated 5BR/6BA compound with heated pool, kosher kitchen, and guest house in Beverlywood. Fully furnished from $34,999/mo.',
  keywords: 'luxury rental 90035, 90035 luxury homes for rent, luxury house for rent 90035, luxury rental zip code 90035, furnished rental 90035, beverlywood luxury rental 90035, los angeles 90035 rental',
  openGraph: {
    title: 'Luxury Rental 90035 | Beverlywood Gated Compound | $34,999/mo',
    description: 'Gated 5BR luxury compound in 90035 zip code (Beverlywood, Los Angeles). Pool, kosher kitchen, guest house. Fully furnished from $34,999/mo.',
    url: 'https://sevennova.ai/luxury-rental-90035',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: 'Luxury Rental 90035 Beverlywood Los Angeles' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luxury Rental 90035 | Beverlywood | $34,999/mo',
    description: 'Gated 5BR compound in 90035 zip code. Pool, kosher kitchen, guest house.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/luxury-rental-90035',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
