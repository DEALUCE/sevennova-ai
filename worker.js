import { onRequestPost } from './functions/api/zoning.js';

const RENTLAELITE_ROUTES = new Set([
  '/_astro',
  '/5-bedroom-luxury-rental-los-angeles',
  '/about',
  '/apply',
  '/beverlywood-neighborhood-guide',
  '/beverly-hills-luxury-rentals',
  '/beverly-hills-market-report',
  '/brief',
  '/contact',
  '/faq',
  '/fifa-2026-executive-housing-los-angeles',
  '/fifa-world-cup-2026-los-angeles-rental',
  '/furnished-rental-los-angeles-90035',
  '/gallery',
  '/gated-compound-rental-los-angeles',
  '/insurance-housing-los-angeles',
  '/super-bowl-2027-housing-los-angeles',
  '/kosher-kitchen-luxury-rental-los-angeles',
  '/luxury-rental-beverlywood',
  '/property',
  '/results',
  '/services',
  '/short-term-luxury-rental-west-los-angeles',
  '/zoning',
  '/corporate-housing-los-angeles',
  '/executive-rental-beverly-hills',
  '/luxury-rental-near-sofi-stadium',
  // /zoning-report is owned by the SevenNova Next.js app â€” do not proxy to rentlaelite.
]);

const RENTLAELITE_BASE = 'https://master.rentlaelite-v2.pages.dev';

function isRentlaelite(pathname) {
  if (RENTLAELITE_ROUTES.has(pathname)) return true;
  for (const route of RENTLAELITE_ROUTES) {
    if (pathname.startsWith(route + '/')) return true;
  }
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/zoning') {
      const context = { request, env, ctx };
      if (request.method === 'POST') return onRequestPost(context);
      return new Response('Method not allowed', { status: 405 });
    }

    // /luxury-rental/* (sub-paths) — never existed as pages, were stale sitemap entries.
    // Return 410 Gone so Google removes them from index instead of serving SPA fallback.
    if (url.pathname.startsWith('/luxury-rental/') && url.pathname !== '/luxury-rental/') {
      return new Response('Gone. This URL never existed.', {
        status: 410,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          'X-Robots-Tag': 'noindex',
        },
      });
    }

    // /luxury-rental (exact) â†’ rentlaelite homepage
    if (url.pathname === '/luxury-rental' || url.pathname === '/luxury-rental/') {
      const targetUrl = new URL('/' + url.search, RENTLAELITE_BASE);
      const resp = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      });
      const newResp = new Response(resp.body, resp);
      newResp.headers.set('Cache-Control', 'no-store');
      newResp.headers.set('X-Robots-Tag', 'index, follow');
      newResp.headers.set('X-Robots-Tag', 'index, follow');
      newResp.headers.delete('CF-Cache-Status');
      newResp.headers.set('X-Robots-Tag', 'index, follow');
      return newResp;
    }

    // IndexNow key file (32-char hex.txt at root) — proxy to rentlaelite for verification
    if (/^\/[a-f0-9]{32}\.txt$/.test(url.pathname)) {
      const targetUrl = new URL(url.pathname, RENTLAELITE_BASE);
      const resp = await fetch(targetUrl.toString(), { redirect: 'follow' });
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' }
      });
    }

    // Rentlaelite static assets â€” long cache (content-hashed)
    if (url.pathname.startsWith('/_astro/') || url.pathname === '/favicon.svg') {
      const targetUrl = new URL(url.pathname + url.search, RENTLAELITE_BASE);
      const resp = await fetch(targetUrl.toString(), { redirect: 'follow' });
      const newResp = new Response(resp.body, resp);
      newResp.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return newResp;
    }

    // Other rentlaelite top-level routes
    if (isRentlaelite(url.pathname)) {
      const targetUrl = new URL(url.pathname + url.search, RENTLAELITE_BASE);
      const resp = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      });
      const newResp = new Response(resp.body, resp);
      newResp.headers.set('Cache-Control', 'no-store');
      newResp.headers.set('X-Robots-Tag', 'index, follow');
      newResp.headers.set('X-Robots-Tag', 'index, follow');
      newResp.headers.delete('CF-Cache-Status');
      return newResp;
    }

    // Everything else (including /luxury-rental/* SEO sub-pages) â†’ Assets
    return env.ASSETS.fetch(request);
  },
};



