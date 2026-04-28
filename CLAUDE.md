# SYSTEM STATE — SevenNova.ai

## Architecture
- **Project:** SevenNova.ai — Next-Gen AI Real Estate Platform
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Cloudflare Pages
- **Repo:** github.com/DEALUCE/sevennova-ai
- **Domain:** sevennova.ai (Cloudflare, propagating)
- **Staging:** sevennova-ai.pages.dev
- **Deploy:** `npx wrangler pages deploy out --project-name=sevennova-ai`
- **Build:** `npm run build` → outputs to `/out` (static export)
- **Email:** info@sevennova.ai → theissakgroup@gmail.com (Cloudflare routing)

## Pages Live
- `/` — Main AI platform landing page
- `/luxury-rental` — 9432 Oakmore Rd full listing (real photos, video, contact form)
- `/luxury-rental/gallery` — 60 photos + lightbox

## Current Tasks
- [x] Domain purchased — sevennova.ai ($160/2yr)
- [x] Site deployed to Cloudflare Pages
- [x] Luxury rental page — Oakmore 9432 complete
- [x] Gallery page with 60 real photos + lightbox
- [x] Email routing — info@sevennova.ai
- [x] Custom domain connected (propagating — up to 48hrs)
- [ ] Verify sevennova.ai is live after propagation
- [ ] Wire contact form to send email via Resend API
- [ ] Build AI property search feature
- [ ] Build zoning lookup page
- [ ] Build market intel page

## Next Step (CRITICAL)
Confirm sevennova.ai is live → wire contact form → build AI property search

## Decisions Log
- sevennova.ai = main domain (score 8.7/10, trillion-dollar AI feel)
- Cloudflare Pages = hosting (free, Wrangler CLI working)
- Static export (`output: 'export'`) required for Cloudflare Pages
- Subroutes: /luxury-rental, /zoning, /market-intel (planned)
- Images copied from rentlaelite-v2 to /public/images/ (60 photos)
- Staying on Cloudflare — no Vercel

## Active Properties
| Property | URL | Status |
|---|---|---|
| 9432 & 9430 Oakmore Rd | /luxury-rental | Live — showing Wed Apr 29 3PM |

## Key Contacts
- Sharon Tay (Altman Brothers) — Glina family showing Wed Apr 29 3PM
- Daniel Issak — DRE #02037760 · 424-272-5935 · theissakgroup@gmail.com

## Rules
- All pages production-ready, no placeholder content
- Always `npm run build` before deploy
- Deploy from `/out` directory only
- Update CLAUDE.md after every session via /save
