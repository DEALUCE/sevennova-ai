'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

const PLAN_INFO: Record<string, { label: string; price: string; desc: string; features: string[] }> = {
  basic: {
    label: 'Basic Report',
    price: '$49',
    desc: 'One-time report',
    features: ['Zoning + APN + LADBS violations', 'Ensemble valuation', 'ADU eligibility', 'PDF export'],
  },
  full: {
    label: 'Full Report',
    price: '$199',
    desc: 'One-time report — all 15 AI skills',
    features: ['All 15 AI skills', 'Deal score + investment thesis', 'Distress signals + DSCR', 'Climate risk + entitlement pathways'],
  },
  institutional: {
    label: 'Institutional Report',
    price: '$499',
    desc: 'One-time report',
    features: ['Everything in Full', 'Market comparables', 'Legal entity graph', 'Analyst review notes'],
  },
  broker: {
    label: 'Broker Plan',
    price: '$299/mo',
    desc: 'Monthly subscription',
    features: ['10 Full reports/month', 'Priority queue', 'Report history dashboard'],
  },
  investor: {
    label: 'Investor Plan',
    price: '$999/mo',
    desc: 'Monthly subscription',
    features: ['Unlimited reports', 'API access', 'Webhook delivery', 'Team seats (3)'],
  },
  enterprise: {
    label: 'Enterprise Plan',
    price: '$5K/mo',
    desc: 'Monthly subscription',
    features: ['White-label output', 'CRM integration', 'Dedicated analyst', 'SLA guarantee'],
  },
};

function CheckoutInner() {
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') ?? 'full';
  const type = searchParams.get('type') ?? 'report';

  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = PLAN_INFO[tier] ?? PLAN_INFO.full;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/v1/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          address: address || undefined,
          zip_code: zip || undefined,
          requester_email: email || undefined,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Checkout failed: ${res.status} — ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }

  return (
    <div style={{ background: S.bg, minHeight: '100vh', fontFamily: S.font, color: S.text }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${S.borderDim}`, background: 'rgba(4,8,15,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ color: S.accent, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.06em', textDecoration: 'none' }}>
            SEVEN<span style={{ color: S.text }}>NOVA</span><span style={{ color: S.accent, opacity: 0.5 }}>.ai</span>
          </Link>
          <Link href="/pricing" style={{ color: S.textDim, fontSize: '0.78rem', textDecoration: 'none', letterSpacing: '0.05em' }}>
            ← BACK TO PRICING
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px' }}>

        {/* Plan summary */}
        <div style={{ background: S.bg2, border: `1px solid ${S.border}`, padding: '28px 32px', marginBottom: 24 }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 14 }}>
            Selected Plan
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{plan.label}</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: S.accent }}>{plan.price}</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: S.textMuted, marginBottom: 16 }}>{plan.desc}</p>
          <div style={{ borderTop: `1px solid ${S.borderDim}`, paddingTop: 14 }}>
            {plan.features.map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: S.textDim, marginBottom: 6 }}>
                <span style={{ color: '#00ff88', fontWeight: 700 }}>+</span>
                {f}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Link href={`/pricing`} style={{ color: S.textMuted, fontSize: '0.7rem', textDecoration: 'none' }}>
              Change plan →
            </Link>
          </div>
        </div>

        {/* Checkout form */}
        <form onSubmit={handleCheckout} style={{ background: S.bg2, border: `1px solid ${S.borderDim}`, padding: '28px 32px' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: S.textMuted, textTransform: 'uppercase', marginBottom: 20 }}>
            Order Details
          </p>

          {type !== 'subscription' && (
            <>
              <label style={{ display: 'block', fontSize: '0.7rem', color: S.textDim, letterSpacing: '0.06em', marginBottom: 6 }}>
                PROPERTY ADDRESS (OPTIONAL)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="3612 W Jefferson Blvd"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, color: S.text, fontFamily: S.font, padding: '11px 14px', fontSize: '0.85rem', outline: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = S.borderDim)}
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={zip}
                  onChange={e => setZip(e.target.value)}
                  maxLength={5}
                  style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, color: S.text, fontFamily: S.font, padding: '11px 10px', fontSize: '0.85rem', outline: 'none', textAlign: 'center' }}
                  onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = S.borderDim)}
                />
              </div>
            </>
          )}

          <label style={{ display: 'block', fontSize: '0.7rem', color: S.textDim, letterSpacing: '0.06em', marginBottom: 6 }}>
            EMAIL — REPORT DELIVERY
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ background: S.bg3, border: `1px solid ${S.borderDim}`, color: S.text, fontFamily: S.font, padding: '11px 14px', fontSize: '0.85rem', outline: 'none', width: '100%', marginBottom: 24 }}
            onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
            onBlur={e => (e.currentTarget.style.borderColor = S.borderDim)}
          />

          {error && (
            <div style={{ background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)', padding: '12px 16px', marginBottom: 16, fontSize: '0.75rem', color: '#ff4757' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#1a3a4a' : S.accent,
              color: loading ? S.textMuted : S.bg,
              fontFamily: S.font, fontWeight: 700,
              fontSize: '0.85rem', letterSpacing: '0.1em',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'REDIRECTING TO STRIPE...' : `PAY ${plan.price} →`}
          </button>

          <p style={{ fontSize: '0.66rem', color: S.textMuted, textAlign: 'center', marginTop: 14, lineHeight: 1.7 }}>
            Secure checkout powered by Stripe. You&apos;ll be redirected to complete payment.
            <br />
            Report delivered by email within 60 seconds of payment.
          </p>
        </form>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${S.borderDim}`, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ color: S.textMuted, fontSize: '0.7rem' }}>
          © 2026 SevenNova.ai · For informational purposes only.
        </p>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#04080f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", color: '#94a3b8', fontSize: '0.8rem' }}>
        LOADING...
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
