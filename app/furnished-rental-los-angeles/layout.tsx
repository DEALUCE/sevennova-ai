import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Furnished Rental Los Angeles | Luxury 5BR | $34,999/mo',
  description: 'Fully furnished luxury rental in Los Angeles. Gated 5BR/6BA compound in Beverlywood with heated pool, kosher kitchen, and guest house. Move-in ready. From $34,999/mo.',
  keywords: 'furnished rental Los Angeles, furnished luxury rental LA, fully furnished house for rent Los Angeles, furnished rental beverlywood, luxury furnished rental 90035, furnished rental near Beverly Hills, furnished home rental LA, luxury furnished rental kosher',
  openGraph: {
    title: 'Furnished Rental Los Angeles | Luxury Gated 5BR | $34,999/mo',
    description: 'Fully furnished luxury rental in Los Angeles — gated 5BR compound, heated pool, kosher kitchen, Beverly Hills adjacent. From $34,999/mo.',
    url: 'https://sevennova.ai/furnished-rental-los-angeles',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: 'Furnished Luxury Rental Los Angeles Beverlywood' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Furnished Rental Los Angeles | Luxury 5BR | $34,999/mo',
    description: 'Fully furnished 5BR luxury compound in Beverlywood, LA. Pool, kosher kitchen, guest house.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/furnished-rental-los-angeles',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
