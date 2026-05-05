'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const S = {
  bg: '#04080f',
  bg2: '#070d18',
  bg3: '#0a1220',
  accent: '#00d4ff',
  text: '#e8f0fe',
  textDim: '#94a3b8',
  textMuted: '#5a7090',
  border: 'rgba(0,212,255,0.12)',
  borderDim: 'rgba(255,255,255,0.06)',
  green: '#00ff88',
  font: "'Space Mono', monospace",
};

function SuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const requestId = searchParams.get('request_id');

  return (
    <div style={{ background: S.bg, minHeight: '100vh', fontFamily: S.font, color: S.text }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${S.borderDim}`, background: 'rgba(4,8,15,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ color: S.accent, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em', textDecoration: 'none' }}>
            SEVEN<span style={{ color: S.text }}>NOVA</span><span style={{ color: S.accent, opacity: 0.5 }}>.ai</span>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>

        {/* Success icon */}
        <div style={{
          width: 64, height: 64, margin: '0 auto 28px',
          border: `2px solid ${S.green}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem',
        }}>
          ✓
        </div>

        <div style={{ display: 'inline-block', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: S.green, fontSize: '0.65rem', letterSpacing: '0.14em', padding: '4px 12px', marginBottom: 24 }}>
          PAYMENT CONFIRMED
        </div>

        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
          Your Report Is<br /><span style={{ color: S.accent }}>Being Generated.</span>
        </h1>

        <p style={{ color: S.textDim, fontSize: '0.88rem', lineHeight: 1.8, marginBottom: 40 }}>
          All 15 AI skills are now running on your property.
          You&apos;ll receive your full report by email within 60 seconds.
          A copy will also be available for download below once ready.
        </p>

        {/* Session info */}
        <div style={{ background: S.bg2, border: `1px solid ${S.borderDim}`, padding: '20px 24px', marginBottom: 32, textAlign: 'left' }}>
          {sessionId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${S.borderDim}`, fontSize: '0.72rem' }}>
              <span style={{ color: S.textMuted }}>Session ID</span>
              <span style={{ color: S.textDim, fontSize: '0.65rem', fontFamily: 'monospace' }}>{sessionId.slice(0, 30)}...</span>
            </div>
          )}
          {requestId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${S.borderDim}`, fontSize: '0.72rem' }}>
              <span style={{ color: S.textMuted }}>Report ID</span>
              <span style={{ color: S.accent, fontSize: '0.72rem' }}>{requestId}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.72rem' }}>
            <span style={{ color: S.textMuted }}>Expected delivery</span>
            <span style={{ color: S.green }}>&lt;60 seconds</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {requestId && (
            <Link
              href={`/analyze?request_id=${requestId}`}
              style={{
                padding: '12px 24px',
                background: S.accent, color: S.bg,
                fontSize: '0.78rem', fontWeight: 700,
                letterSpacing: '0.08em', textDecoration: 'none',
              }}
            >
              VIEW REPORT →
            </Link>
          )}
          <Link
            href="/analyze"
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: `1px solid ${S.borderDim}`,
              color: S.textDim,
              fontSize: '0.78rem', letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
          >
            ANALYZE ANOTHER
          </Link>
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: `1px solid ${S.borderDim}`,
              color: S.textDim,
              fontSize: '0.78rem', letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
          >
            HOME
          </Link>
        </div>

        <p style={{ color: S.textMuted, fontSize: '0.68rem', marginTop: 40, lineHeight: 1.8 }}>
          Questions? Email{' '}
          <a href="mailto:dan.issak@gmail.com" style={{ color: S.accent, textDecoration: 'none' }}>
            dan.issak@gmail.com
          </a>
          <br />
          For informational purposes only. Not a licensed appraisal.
        </p>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${S.borderDim}`, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ color: S.textMuted, fontSize: '0.7rem' }}>
          © 2026 SevenNova.ai — All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#04080f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", color: '#94a3b8', fontSize: '0.8rem' }}>
        LOADING...
      </div>
    }>
      <SuccessInner />
    </Suspense>
  );
}
