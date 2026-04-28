import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kosher Kitchen Rental Los Angeles | Jewish Neighborhood | Beverlywood | SevenNova.ai',
  description: 'Luxury rental with full kosher kitchen in Beverlywood, Los Angeles. Walking distance to shuls, 5BR/6BA gated compound, $34,999/mo fully furnished. Perfect for Jewish families.',
  keywords: 'kosher kitchen rental Los Angeles, Jewish neighborhood rental LA, luxury rental near shul, Beverlywood Jewish rental, kosher home rental 90035, luxury rental walking distance synagogue LA',
  alternates: { canonical: 'https://sevennova.ai/kosher-rental-los-angeles' },
}

export default function KosherPage() {
  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,26,0.95)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #f5a623, #f9d423)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0e1a', fontSize: '14px' }}>SN</div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: '#e2e8f0' }}>SevenNova<span style={{ color: '#f5a623' }}>.ai</span></span>
        </Link>
        <a href="tel:424-272-5935" style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>📞 424-272-5935</a>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 40px' }}>
        <p style={{ color: '#f5a623', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>✡️ Jewish Community · Beverlywood · Los Angeles</p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
          Kosher Kitchen Rental<br />
          <span style={{ background: 'linear-gradient(135deg, #f5a623, #f9d423)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Los Angeles</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '48px' }}>
          The only luxury rental in Beverlywood with a full kosher kitchen, walking distance to major shuls, and a private gated compound perfect for Jewish families visiting or relocating to Los Angeles.
        </p>

        <div style={{ marginBottom: '40px' }}>
          <img src="/images/kitchen-1.jpg" alt="Full kosher kitchen luxury rental Los Angeles Beverlywood" style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', height: '400px' }} />
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>Full Kosher Kitchen Features</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {['Dual sinks — fully separated', 'Dual ovens', 'Gourmet island with ceramic countertops', 'Dishwasher', 'Full size refrigerator', 'All appliances available for kosher use'].map(item => (
            <div key={item} style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#94a3b8' }}>
              <span style={{ color: '#f5a623' }}>✓</span> {item}
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }}>Jewish Neighborhood — Beverlywood 90035</h2>
        <p style={{ color: '#64748b', lineHeight: 1.9, marginBottom: '32px', fontSize: '15px' }}>
          Beverlywood is one of Los Angeles's most established and vibrant Jewish communities. The neighborhood is home to numerous Orthodox, Conservative, and Modern Orthodox synagogues within walking distance. Pico Boulevard — just minutes away — is lined with kosher restaurants, bakeries, and markets. The community is warm, walkable, and family-friendly.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
          {['Walking distance to multiple major shuls', '3-minute walk to Circle Park — family friendly', 'Kosher restaurants and markets on Pico Blvd', 'Strong Shabbat-walking community', 'Close to Jewish day schools', 'Active Jewish community events year-round'].map(item => (
            <div key={item} style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#94a3b8' }}>
              <span style={{ color: '#f5a623' }}>✓</span> {item}
            </div>
          ))}
        </div>

        <Link href="/luxury-rental" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623, #f9d423)', color: '#0a0e1a', borderRadius: '12px', padding: '18px 48px', fontWeight: 900, fontSize: '18px', textDecoration: 'none', marginBottom: '16px' }}>
          View Full Property & Schedule Showing →
        </Link>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '12px' }}>Call: <a href="tel:424-272-5935" style={{ color: '#f5a623' }}>424-272-5935</a> · <a href="mailto:info@sevennova.ai" style={{ color: '#f5a623' }}>info@sevennova.ai</a> · DRE #02037760</p>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '13px' }}>© 2026 SevenNova.ai · Kosher Rentals Los Angeles · The Issak Group · DRE #02037760</p>
      </footer>
    </div>
  )
}
