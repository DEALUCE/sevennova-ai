import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SevenNova.ai — AI-Powered Real Estate Intelligence",
  description: "Institutional-grade property analysis in under 60 seconds. Zoning, valuation, distress signals, entitlement pathways, climate risk — all in one report.",
  keywords: "AI real estate analysis, property intelligence, zoning analysis, distress signals, LA real estate, investment analysis",
  alternates: { canonical: "https://sevennova.ai" },
  openGraph: {
    title: "SevenNova.ai — AI-Powered Real Estate Intelligence",
    description: "Institutional-grade property analysis in under 60 seconds.",
    url: "https://sevennova.ai",
    siteName: "SevenNova.ai",
    type: "website",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SevenNova.ai",
  "url": "https://sevennova.ai",
  "applicationCategory": "BusinessApplication",
  "description": "AI-powered real estate intelligence platform for property analysis, zoning, valuation, and investment decisions.",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "49",
    "highPrice": "499",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceMono.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
