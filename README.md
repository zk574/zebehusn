# Zeb-e-Husn — Luxury E-commerce (Next.js 16)

Premium multi-category grooming, fragrance & beauty store for Pakistan.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000  (.env.local is already filled with your Supabase URL + publishable key)
npm run build && npm start   # production
```
Without Supabase env vars the site falls back to the sample catalogue (development only).

## Database setup (Supabase) — one time
1. Supabase dashboard → **SQL Editor** → **New query**.
2. Paste all of `supabase/migrations/001_schema.sql` → **Run**. Wait for "Success".
3. New query → paste `supabase/migrations/002_seed.sql` → **Run** (sample products — optional).
4. Check **Table Editor**: you should see products, categories, orders, etc.

Both files are safe to run again.

### What the database enforces
- `place_order()` is the only way to create an order: it re-prices from the database, locks rows and decrements stock atomically (no overselling), applies coupons and shipping.
- Cancelling an order restores stock automatically; every status change is logged for tracking.
- Customers can't read other people's orders, change prices or make themselves admin (Row Level Security).
- Reviews require a delivered order containing that product, and appear only after approval.
- Bank account details are hidden from the public and only shown after a bank-transfer order.
- `supabase/tests/schema.test.mjs` — 29 automated checks of the above (runs on PGlite).

## Stack
Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind v4 ·
Three.js + React Three Fiber + drei · GSAP ScrollTrigger · Zustand · Zod

## Where things live
| What | File |
|---|---|
| Brand name, contacts, socials, shipping rules | `src/config/site.ts` |
| Design tokens (colours, fonts) | `src/app/globals.css` |
| Sample catalogue (replace from admin in Stage 4–5) | `src/lib/seed.ts` |
| Data access layer (swap to Supabase here) | `src/lib/catalog.ts` |
| 3D perfume assembly / showcase | `src/components/three/PerfumeScene.tsx` |
| Server-side price verification | `src/lib/server/pricing.ts` |
| Logo (replace with your file) | `Logo()` in `src/components/layout/Header.tsx` |

## 3D behaviour
- Bottle is built procedurally (8 parts) — no model download needed. Upload a GLB later via `product.modelUrl`.
- Lazy-loaded (separate JS chunk), renders only while on-screen.
- Mobile / low-memory devices get a lighter material set & lower pixel ratio.
- No WebGL, reduced-motion, or data-saver → static image fallback.

## Build status
- [x] Stage 1 — architecture & design system
- [x] Stage 2 — homepage (15 sections) + scroll-driven 3D assembly + interactive showcase
- [x] Stage 3 — shop, 10 category pages, product pages (variants, 3D viewer, FBT, schema), search, cart, wishlist, content & policy pages, journal, sitemap, robots
- [x] Checkout — COD & bank transfer orders saved in the database
- [x] Stage 4 — Supabase schema + RLS, atomic orders & stock, coupons, order tracking, verified reviews, newsletter, storage buckets
- [ ] Stage 5 — admin dashboard
- [ ] Stage 6 — payment gateways (Safepay / PayFast / JazzCash / Easypaisa — sandbox first)
- [ ] Stage 7 — shipping & courier integration
- [ ] Stage 8 — analytics, Meta Pixel, rate limiting, security hardening
- [ ] Stage 9–10 — testing & deployment

## Honest notes
- Product names, prices and copy in `seed.ts` are placeholders.
- Reviews show an empty state; only verified-purchase reviews will be displayed.
- Card / wallet payments are shown as "coming soon" and cannot be selected until real merchant credentials are connected.
- Privacy Policy & Terms are drafts — have them reviewed by a lawyer.
