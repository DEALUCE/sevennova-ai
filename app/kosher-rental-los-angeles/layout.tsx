import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kosher Kitchen Rental Los Angeles | Beverlywood | Luxury Home $34,999/mo',
  description: 'The only luxury rental in Los Angeles with a certified kosher kitchen. Beverlywood 90035 — dual sinks, dual ovens, walking distance to Pico Robertson synagogues. From $34,999/mo.',
  keywords: 'kosher kitchen rental Los Angeles, kosher rental LA, kosher house rental Beverly Hills, luxury rental near synagogue Los Angeles, Jewish neighborhood rental LA, kosher furnished rental Beverlywood, Pico Robertson luxury rental kosher, kosher home rental 90035',
  openGraph: {
    title: 'Kosher Kitchen Luxury Rental Los Angeles | Beverlywood 90035',
    description: 'Gated 5BR luxury compound with certified kosher kitchen in Beverlywood. Dual sinks, dual ovens, walking distance to Pico Blvd synagogues. From $34,999/mo.',
    url: 'https://sevennova.ai/kosher-rental-los-angeles',
    siteName: 'SevenNova.ai',
    type: 'website',
    images: [{ url: 'https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg', width: 1200, height: 630, alt: 'Kosher Kitchen Luxury Rental Beverlywood Los Angeles' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kosher Kitchen Rental Los Angeles | Luxury Home | $34,999/mo',
    description: 'The only luxury rental in LA with certified kosher kitchen. Beverlywood, walking distance to synagogues.',
    images: ['https://sevennova.ai/images/DJI_20250122125313_0947_D.jpg'],
  },
  alternates: {
    canonical: 'https://sevennova.ai/kosher-rental-los-angeles',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
