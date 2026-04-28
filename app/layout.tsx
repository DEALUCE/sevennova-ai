import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SevenNova.ai — Next-Generation AI Real Estate Intelligence",
  description: "The most advanced AI platform for real estate. Instant property analysis, zoning intelligence, market predictions, and investment insights powered by artificial intelligence.",
  keywords: "AI real estate, property search, zoning analysis, real estate AI, property intelligence, investment analysis",
  openGraph: {
    title: "SevenNova.ai — AI Real Estate Intelligence",
    description: "Next generation of real estate powered by AI. Search, analyze, and invest smarter.",
    url: "https://sevennova.ai",
    siteName: "SevenNova.ai",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
