import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beverlywood Luxury Rental | Gated 5BR Compound $34,999/mo',
  description: 'Luxury rental in Beverlywood, Los Angeles. Gated 5BR/6BA compound with heated pool, kosher kitchen, and guest house. Beverly Hills adjacent, 90035 zip code. From $34,999/mo.',
  keywords: 'beverlywood luxury rental, luxury home for rent beverlywood, beverlywood rental, luxury rental beverlywood 90035, beverlywood gated compound rental, beverlywood furnished rental, luxury rental near beverly hills, beverlywood real estate rental',
  openGraph: {
    title: 'Beverlywood Luxury Rental | Gated 5BR Compound | $34,999/mo',
    description: 'Gated 5BR luxury compound in Beverlywood. Heated pool, kosher kitchen, guest house. Beverly Hills adjacent. From $34,999/mo fully furnished.',
    url: 'https://sevennova.ai/beverlywood-luxury-rental',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: 'Beverlywood Luxury Rental Gated Compound Los Angeles' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beverlywood Luxury Rental | 5BR Gated Compound | $34,999/mo',
    description: 'Gated 5BR compound in Beverlywood. Pool, kosher kitchen, guest house. Beverly Hills adjacent.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/beverlywood-luxury-rental',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
