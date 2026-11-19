-- ═══════════════════════════════════════════════════════════════════════
-- Zeb-e-Husn — 004 lockdown
--
-- ⚠ Run this ONLY after SUPABASE_SECRET_KEY is set on the website
--   (.env.local locally, and in your hosting dashboard) and the site has been
--   redeployed. Otherwise checkout, tracking, reviews and newsletter stop working.
--
-- After this, nobody can call the order / tracking / review / newsletter
-- functions directly with the public key: every request must go through the
-- website, where rate limits apply. Exact stock numbers are also hidden from
-- the public key.
-- ═══════════════════════════════════════════════════════════════════════

revoke execute on function public.place_order(jsonb, jsonb, text, text, int, uuid)       from public, anon, authenticated;
revoke execute on function public.quote_order(jsonb, text)                               from public, anon, authenticated;
revoke execute on function public.track_order(text, text)                                from public, anon, authenticated;
revoke execute on function public.submit_review(text, text, text, int, text, text, text) from public, anon, authenticated;
revoke execute on function public.subscribe_newsletter(text, text)                       from public, anon, authenticated;

grant execute on function public.place_order(jsonb, jsonb, text, text, int, uuid)       to service_role;
grant execute on function public.quote_order(jsonb, text)                               to service_role;
grant execute on function public.track_order(text, text)                                to service_role;
grant execute on function public.submit_review(text, text, text, int, text, text, text) to service_role;
grant execute on function public.subscribe_newsletter(text, text)                       to service_role;

-- Public key may read every variant column except the exact stock count.
revoke select on public.product_variants from anon;
grant select (id, product_id, sku, label, price, compare_at, sort, is_active, created_at, updated_at)
  on public.product_variants to anon;
