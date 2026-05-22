import { onRequestPost } from './functions/api/zoning.js';

const RENTLAELITE_ROUTES = new Set([
  '/_astro',
  '/about',
  '/apply',
  '/beverly-hills-luxury-rentals',
  '/beverly-hills-market-report',
  '/brief',
  '/contact',
  '/faq',
  '/fifa-2026-executive-housing-los-angeles',
  '/fifa-world-cup-2026-los-angeles-rental',
  '/furnished-rental-los-angeles-90035',
  '/gallery',
  '/luxury-rental-beverlywood',
  '/property',
  '/results',
  '/services',
  '/short-term-luxury-rental-west-los-angeles',
  '/zoning-report',
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

    // /luxury-rental (exact) → rentlaelite homepage
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
      newResp.headers.delete('CF-Cache-Status');
      return newResp;
    }

    // Rentlaelite static assets — long cache (content-hashed)
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
      newResp.headers.delete('CF-Cache-Status');
      return newResp;
    }

    // Everything else (including /luxury-rental/* SEO sub-pages) → Assets
    return env.ASSETS.fetch(request);
  },
};
