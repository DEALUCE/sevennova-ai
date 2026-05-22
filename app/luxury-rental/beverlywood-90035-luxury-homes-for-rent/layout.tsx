import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beverlywood 90035 Luxury Homes for Rent | Kosher | FIFA 2026 | From $34,999/mo',
  description: 'Find luxury homes for rent in Beverlywood, Los Angeles 90035. Gated compounds, kosher kitchens, heated pools. FIFA 2026 available May–Aug 2026. Fully furnished from $34,999/mo.',
  keywords: 'Beverlywood luxury homes for rent, 90035 luxury rental, beverlywood furnished rental, kosher kitchen rental Beverlywood, FIFA 2026 rental Beverlywood, luxury home rental 90035, gated home rental Beverlywood, Jewish neighborhood luxury rental LA, Beverly Hills adjacent luxury rental, Pico Robertson luxury home rental',
  openGraph: {
    title: 'Luxury Homes for Rent in Beverlywood 90035 | Kosher | FIFA 2026',
    description: 'Gated luxury compounds in Beverlywood, Los Angeles. Kosher kitchens, heated pools, guest houses. FIFA 2026 available. Fully furnished from $34,999/mo.',
    url: 'https://sevennova.ai/luxury-rental/beverlywood-90035-luxury-homes-for-rent',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: 'Luxury Home for Rent in Beverlywood 90035 Los Angeles' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luxury Homes for Rent in Beverlywood 90035 | From $34,999/mo',
    description: 'Gated luxury compounds, kosher kitchens, heated pools. FIFA 2026 available May–Aug 2026.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/luxury-rental/beverlywood-90035-luxury-homes-for-rent',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
