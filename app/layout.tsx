import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SevenNova.ai — Luxury Rentals & AI Real Estate Intelligence Los Angeles",
  description: "Luxury furnished rentals in Los Angeles and AI-powered property intelligence. Featured: 5BR gated compound in Beverlywood, kosher kitchen, heated pool. $34,999/mo.",
  keywords: "luxury rental Los Angeles, AI real estate, Beverlywood rental, kosher rental LA, FIFA 2026 rental Los Angeles",
  alternates: { canonical: "https://sevennova.ai" },
  openGraph: {
    title: "SevenNova.ai — Luxury Rentals & AI Real Estate Los Angeles",
    description: "Luxury furnished rentals in Los Angeles and AI-powered property intelligence.",
    url: "https://sevennova.ai",
    siteName: "SevenNova.ai",
    type: "website",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "name": "SevenNova",
      "url": "https://sevennova.ai",
      "description": "AI-powered luxury real estate intelligence and furnished rental listings in Los Angeles. Specializing in kosher properties and FIFA 2026 short-term rentals in Beverlywood.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Los Angeles",
        "addressRegion": "CA",
        "postalCode": "90035",
        "addressCountry": "US"
      },
      "telephone": "+14242725935",
      "email": "info@sevennova.ai",
      "sameAs": [
        "https://sevennova.ai",
        "https://sevennova.ai/luxury-rental"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "sales",
        "telephone": "+14242725935",
        "email": "info@sevennova.ai",
        "availableLanguage": "English"
      }
    },
    {
      "@type": "WebSite",
      "url": "https://sevennova.ai",
      "name": "SevenNova.ai",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://sevennova.ai/property?address={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
