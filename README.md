# Zeb-e-Husn — Luxury E-commerce (Next.js 16)

Premium multi-category grooming, fragrance & beauty store for Pakistan.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000  (.env.local is already filled with your Supabase URL + publishable key)
npm run build && npm start   # production
```
Without Supabase env vars the site falls back to the sample catalogue (development only).
In production the sample catalogue is never shown: if the database can't be read, visitors see an error page instead of fake products.

## Database setup (Supabase) — one time
1. Supabase dashboard → **SQL Editor** → **New query**.
2. Paste all of `supabase/migrations/001_schema.sql` → **Run**. Wait for "Success".
3. New query → paste `supabase/migrations/002_seed.sql` → **Run** (sample products — optional).
4. New query → paste `supabase/migrations/003_hardening.sql` → **Run**. **Required** by the current website code
   (checkout price check, duplicate-order protection, shared rate limits). Safe with the old code too, so run it before deploying.
5. Check **Table Editor**: you should see products, categories, orders, etc.

### Lock the database to the website (do this before going live)
1. Supabase → **Project Settings → API Keys** → copy the **Secret key**.
2. Put it in `.env.local` and in your hosting dashboard as `SUPABASE_SECRET_KEY=...` (never `NEXT_PUBLIC_`), then redeploy.
3. Only then run `supabase/migrations/004_lockdown.sql`.
   After this, nobody can place orders, track orders or post reviews by calling Supabase directly with the public key —
   everything goes through the website and its rate limits. Exact stock numbers are hidden from the public key too.

All files are safe to run again, but always in order: 001 → 002 → 003 → 004.
If you ever re-run 001, re-run 003 (and 004) after it.

### What the database enforces
- `place_order()` is the only way to create an order: it re-prices from the database, locks rows and decrements stock atomically (no overselling), applies coupons and shipping.
- The checkout shows server-verified prices, coupon discount and shipping (`quote_order()`), and an order is refused if its total differs from what the customer saw.
- Retrying "Place order" after a network error never creates a second order (idempotency key).
- Stock follows the order status: cancelled or refunded-before-dispatch → stock goes back; re-opened → stock is taken again. Refunds after dispatch are left for you to restock by hand after inspecting the return.
- Customers can't read other people's orders, change prices or make themselves admin (Row Level Security).
- Reviews require a delivered order containing that product, and appear only after approval.
- Bank account details are hidden from the public and only shown after a bank-transfer order.
- `npm run test:db` — automated checks of all of the above, including the lockdown (runs on PGlite, no Supabase needed).

## Stack
Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind v4 ·
Three.js + React Three Fiber + drei · GSAP ScrollTrigger · Zustand · Zod

## Where things live
| What | File |
|---|---|
| Brand name, contacts, socials, shipping rules | `src/config/site.ts` (empty email/social links stay hidden) |
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
