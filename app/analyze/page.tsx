'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sevennova.ai';

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
  font: "'Space Mono', monospace",
};

function AnalyzeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [address, setAddress] = useState(searchParams.get('address') ?? '');
  const [zip, setZip] = useState(searchParams.get('zip') ?? '');
  const [tier, setTier] = useState(searchParams.get('tier') ?? 'full');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Auto-run if address came from homepage
  useEffect(() => {
    if (searchParams.get('address')) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!address.trim()) return;
    setStatus('loading');
    setError('');
    setHtml('');

    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);

    try {
      const res = await fetch(`${API_BASE}/api/v1/report/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street: address.trim(),
          zip_code: zip || undefined,
          tier,
        }),
      });

      const text = await res.text();
      clearInterval(timer);
      setElapsed(Math.floor((Date.now() - start) / 1000));

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      setHtml(text);
      setStatus('done');
    } catch (err) {
      clearInterval(timer);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  return (
    <div style={{ background: S.bg, minHeight: '100vh', fontFamily: S.font, color: S.text }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${S.borderDim}`, background: 'rgba(4,8,15,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ color: S.accent, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em', textDecoration: 'none' }}>
            SEVEN<span style={{ color: S.text }}>NOVA</span><span style={{ color: S.accent, opacity: 0.5 }}>.ai</span>
          </Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/pricing" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>PRICING</Link>
            <Link href="/" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>HOME</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '28px 32px', marginBottom: 32 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 16 }}>
            Analyze Property
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Street address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, color: S.text, fontFamily: S.font, padding: '12px 16px', fontSize: '0.88rem', outline: 'none', width: '100%' }}
              onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = S.borderDim)}
            />
            <input
              type="text"
              placeholder="ZIP"
              value={zip}
              onChange={e => setZip(e.target.value)}
              maxLength={5}
              style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, color: S.text, fontFamily: S.font, padding: '12px 10px', fontSize: '0.88rem', outline: 'none', textAlign: 'center' }}
              onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = S.borderDim)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {[
              { value: 'basic', label: 'Basic — $49' },
              { value: 'full', label: 'Full — $199' },
              { value: 'institutional', label: 'Institutional — $499' },
            ].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTier(t.value)}
                style={{
                  flex: 1, padding: '8px 10px',
                  fontSize: '0.7rem', fontFamily: S.font,
                  fontWeight: tier === t.value ? 700 : 400,
                  background: tier === t.value ? 'rgba(0,212,255,0.1)' : 'transparent',
                  border: tier === t.value ? `1px solid ${S.accent}` : `1px solid ${S.borderDim}`,
                  color: tier === t.value ? S.accent : S.textMuted,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%', padding: '13px',
              background: status === 'loading' ? '#1a3a4a' : S.accent,
              color: status === 'loading' ? S.textMuted : S.bg,
              fontFamily: S.font, fontWeight: 700,
              fontSize: '0.82rem', letterSpacing: '0.1em',
              border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'loading' ? `GENERATING REPORT... (${elapsed}s)` : 'GENERATE REPORT →'}
          </button>
        </form>

        {/* Loading state */}
        {status === 'loading' && (
          <div style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '40px', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '2px solid rgba(0,212,255,0.15)', borderTop: `2px solid ${S.accent}`, borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: S.accent, fontSize: '0.85rem', letterSpacing: '0.06em', marginBottom: 8 }}>
              RUNNING 15 AI SKILLS
            </p>
            <p style={{ color: S.textMuted, fontSize: '0.75rem' }}>
              Zoning · Valuation · Distress · Entitlement · Climate Risk
            </p>
            <p style={{ color: S.textMuted, fontSize: '0.72rem', marginTop: 16 }}>
              {elapsed}s elapsed · Target &lt;60s
            </p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{ background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)', padding: '24px 28px' }}>
            <p style={{ color: '#ff4757', fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>
              ⚠ Report Generation Failed
            </p>
            <p style={{ color: S.textDim, fontSize: '0.8rem' }}>{error}</p>
            <p style={{ color: S.textMuted, fontSize: '0.72rem', marginTop: 12 }}>
              The API may not be running. Check that the orchestrator is deployed and NEXT_PUBLIC_API_URL is set.
            </p>
          </div>
        )}

        {/* Report output */}
        {status === 'done' && html && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: '0.72rem', color: S.textMuted, letterSpacing: '0.06em' }}>
                REPORT GENERATED IN {elapsed}s
              </p>
              <button
                onClick={() => {
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sevennova-report-${Date.now()}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  background: 'transparent', border: `1px solid ${S.borderDim}`,
                  color: S.textDim, fontFamily: S.font,
                  fontSize: '0.7rem', padding: '6px 14px',
                  cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >
                DOWNLOAD HTML
              </button>
            </div>
            <iframe
              srcDoc={html}
              style={{ width: '100%', height: '80vh', border: `1px solid ${S.borderDim}`, background: '#fff' }}
              title="Property Report"
            />
          </div>
        )}

      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#04080f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", color: '#94a3b8', fontSize: '0.8rem' }}>
        LOADING...
      </div>
    }>
      <AnalyzeInner />
    </Suspense>
  );
}
