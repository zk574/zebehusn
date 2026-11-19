-- ═══════════════════════════════════════════════════════════════════════
-- Zeb-e-Husn — 003 hardening
-- Run AFTER 001 and 002 (Supabase → SQL Editor → paste → Run). Safe to re-run.
-- Always run the files in order: 001 → 002 → 003 (→ 004).
--
-- • quote_order(): verified prices, coupon, shipping and stock BEFORE ordering
-- • place_order(): idempotency key (no duplicate orders on retry), expected-total
--   check (customer is never charged a different total than shown), merges
--   duplicate SKUs and locks rows in a fixed order (no deadlocks)
-- • stock follows every status change (cancel / refund / re-open)
-- • duplicate reviews get a clear message
-- • shared rate-limit store used by the website (rate_limit_hit)
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── New columns ─────────────────────────
alter table public.orders add column if not exists idempotency_key uuid unique;
alter table public.orders add column if not exists stock_released boolean not null default false;

-- Orders cancelled under the old trigger already had their stock put back.
update public.orders set stock_released = true where status = 'cancelled' and not stock_released;

-- Percent coupons can never exceed 100 %.
do $$ begin
  alter table public.coupons add constraint coupons_percent_max check (kind <> 'percent' or value <= 100);
exception when duplicate_object then null; end $$;

-- ───────────────────────── Helpers (not public) ─────────────────────────

-- Validates the cart JSON and returns one row per SKU (duplicates merged), sorted by SKU
-- so every order locks variant rows in the same order.
create or replace function public.cart_items(p_items jsonb)
returns table (sku text, qty int) language plpgsql immutable set search_path = '' as $$
declare e jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your bag is empty.' using errcode = 'P0001';
  end if;
  for e in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(e) <> 'object' or coalesce(e ->> 'sku', '') = '' or char_length(e ->> 'sku') > 40
       or coalesce(e ->> 'qty', '') !~ '^[0-9]{1,3}$' then
      raise exception 'Invalid item in your bag.' using errcode = 'P0001';
    end if;
    if (e ->> 'qty')::int not between 1 and 20 then
      raise exception 'Invalid quantity.' using errcode = 'P0001';
    end if;
  end loop;
  return query
    select x.s, sum(x.q)::int
      from (select e2 ->> 'sku' as s, (e2 ->> 'qty')::int as q from jsonb_array_elements(p_items) e2) x
     group by x.s
     order by x.s;
end $$;

-- Shipping charged on the amount AFTER discount.
create or replace function public.shipping_for(p_amount int)
returns int language sql stable set search_path = '' as $$
  select case when p_amount >= coalesce((s.v ->> 'free_over')::int, 5000) then 0
              else coalesce((s.v ->> 'flat_rate')::int, 250) end
    from (select (select value from public.site_settings where key = 'shipping') as v) s;
$$;

-- Which payment methods are switched on (site_settings → payments).
create or replace function public.payment_methods()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'cod',  coalesce((s.v ->> 'cod')::boolean, false),
    'bank', coalesce((s.v ->> 'bank')::boolean, false))
    from (select (select value from public.site_settings where key = 'payments') as v) s;
$$;

-- Coupon check. Returns the discount, or an error message (never raises).
create or replace function public.coupon_discount(p_code text, p_subtotal int, p_lock boolean default false)
returns table (code text, discount int, error text) language plpgsql security definer set search_path = '' as $$
declare
  c public.coupons%rowtype;
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_code = '' then return query select null::text, 0, null::text; return; end if;
  if p_lock then
    select * into c from public.coupons where coupons.code = v_code for update;
  else
    select * into c from public.coupons where coupons.code = v_code;
  end if;
  if not found or not c.is_active
     or (c.starts_at is not null and now() < c.starts_at)
     or (c.ends_at is not null and now() > c.ends_at)
     or (c.max_uses is not null and c.used_count >= c.max_uses) then
    return query select null::text, 0, 'This coupon is not valid.'::text; return;
  end if;
  if p_subtotal < c.min_subtotal then
    return query select null::text, 0, format('This coupon needs a minimum order of Rs %s.', c.min_subtotal); return;
  end if;
  return query select c.code,
    least(p_subtotal, case when c.kind = 'percent' then (p_subtotal * c.value) / 100 else c.value end)::int,
    null::text;
end $$;

-- What the customer sees after placing an order.
create or replace function public.order_receipt(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'order_number', o.order_number, 'subtotal', o.subtotal, 'discount', o.discount,
    'shipping', o.shipping, 'total', o.total, 'payment_method', o.payment_method,
    'bank_details', case when o.payment_method = 'bank'
                         then (select value from public.site_settings where key = 'bank_details') end)
    from public.orders o where o.id = p_order_id;
$$;

-- ───────────────────────── quote_order ─────────────────────────
-- Read-only price check for the checkout page. Never reveals more than 20 of stock.
create or replace function public.quote_order(p_items jsonb, p_coupon text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  it record; v record; cd record;
  v_lines jsonb := '[]'; v_problems jsonb := '[]';
  v_subtotal int := 0; v_ship int;
begin
  for it in select * from public.cart_items(p_items) loop
    select pv.sku, pv.label, pv.price, pv.stock, p.slug, p.name into v
      from public.product_variants pv join public.products p on p.id = pv.product_id
     where pv.sku = it.sku and pv.is_active and p.is_active;
    if not found then
      v_problems := v_problems || to_jsonb('An item in your bag is no longer available. Please remove it.'::text);
      continue;
    end if;
    if it.qty > 20 then
      v_problems := v_problems || to_jsonb('You can order at most 20 of each item.'::text);
    end if;
    if v.stock < it.qty then
      v_problems := v_problems || to_jsonb(case when v.stock = 0
        then format('%s (%s) is out of stock. Please remove it.', v.name, v.label)
        else format('Only %s × %s (%s) left in stock.', v.stock, v.name, v.label) end);
    end if;
    v_lines := v_lines || jsonb_build_object(
      'sku', v.sku, 'slug', v.slug, 'name', v.name, 'variant', v.label,
      'unit', v.price, 'qty', it.qty, 'total', v.price * it.qty, 'stock', least(v.stock, 20));
    v_subtotal := v_subtotal + v.price * it.qty;
  end loop;

  select * into cd from public.coupon_discount(p_coupon, v_subtotal);
  v_ship := case when v_subtotal = 0 then 0 else public.shipping_for(v_subtotal - cd.discount) end;

  return jsonb_build_object(
    'lines', v_lines, 'problems', v_problems,
    'subtotal', v_subtotal, 'discount', cd.discount, 'coupon', cd.code, 'coupon_error', cd.error,
    'shipping', v_ship, 'total', v_subtotal - cd.discount + v_ship,
    'payments', coalesce(public.payment_methods(), '{"cod": true, "bank": false}'::jsonb));
end $$;

-- ───────────────────────── place_order (v2) ─────────────────────────
drop function if exists public.place_order(jsonb, jsonb, text, text);

create or replace function public.place_order(
  p_items jsonb, p_customer jsonb, p_payment text, p_coupon text default null,
  p_expected_total int default null, p_idempotency_key uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id   uuid;
  v_number     text;
  v_subtotal   int := 0;
  v_shipping   int;
  v_total      int;
  v_item       record;
  v_variant    record;
  v_cd         record;
  v_pay        jsonb;
  v_phone      text := public.normalize_pk_phone(p_customer ->> 'phone');
  v_name       text := btrim(p_customer ->> 'name');
  v_city       text := btrim(p_customer ->> 'city');
  v_address    text := btrim(p_customer ->> 'address');
  v_email      text := nullif(btrim(coalesce(p_customer ->> 'email', '')), '');
begin
  -- Same request sent twice (e.g. retry after a network error) → return the first order.
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
    select id into v_order_id from public.orders where idempotency_key = p_idempotency_key;
    if found then return public.order_receipt(v_order_id); end if;
  end if;

  if v_phone is null then raise exception 'Enter a valid Pakistani mobile number (03XXXXXXXXX).' using errcode = 'P0001'; end if;
  if v_name is null or char_length(v_name) not between 2 and 80 then raise exception 'Please enter your full name.' using errcode = 'P0001'; end if;
  if v_city is null or char_length(v_city) not between 2 and 60 then raise exception 'Please enter your city.' using errcode = 'P0001'; end if;
  if v_address is null or char_length(v_address) not between 8 and 300 then raise exception 'Please enter your complete address.' using errcode = 'P0001'; end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email.' using errcode = 'P0001'; end if;

  v_pay := coalesce(public.payment_methods(), '{}'::jsonb);
  if p_payment is null or p_payment not in ('cod', 'bank') or coalesce((v_pay ->> p_payment)::boolean, false) = false then
    raise exception 'This payment method is not available.' using errcode = 'P0001';
  end if;

  -- Unique order number (retry on the rare collision)
  loop
    v_number := 'ZEH-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' ||
                upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.orders where order_number = v_number);
  end loop;

  insert into public.orders (order_number, user_id, payment_method, payment_status, customer_name, phone, email,
                             city, address, postal_code, notes, subtotal, shipping, total, idempotency_key)
  values (v_number, auth.uid(), p_payment, case when p_payment = 'bank' then 'pending_verification' else 'unpaid' end,
          v_name, v_phone, v_email, v_city, v_address,
          left(nullif(btrim(coalesce(p_customer ->> 'postal_code', '')), ''), 10),
          left(nullif(btrim(coalesce(p_customer ->> 'notes', '')), ''), 300), 0, 0, 0, p_idempotency_key)
  returning id into v_order_id;

  -- Lines (merged & sorted by SKU): lock variant, check stock, decrement, snapshot price
  for v_item in select * from public.cart_items(p_items) loop
    if v_item.qty > 20 then raise exception 'You can order at most 20 of each item.' using errcode = 'P0001'; end if;

    select v.id, v.price, v.stock, v.label, v.sku, p.id as product_id, p.name
      into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.sku = v_item.sku and v.is_active and p.is_active
       for update of v;

    if not found then raise exception 'An item in your bag is no longer available.' using errcode = 'P0001'; end if;
    if v_variant.stock < v_item.qty then
      raise exception 'Only % × % (%) left in stock.', v_variant.stock, v_variant.name, v_variant.label using errcode = 'P0001';
    end if;

    update public.product_variants set stock = stock - v_item.qty where id = v_variant.id;
    insert into public.order_items (order_id, variant_id, product_id, sku, product_name, variant_label, unit_price, qty, line_total)
    values (v_order_id, v_variant.id, v_variant.product_id, v_variant.sku, v_variant.name, v_variant.label,
            v_variant.price, v_item.qty, v_variant.price * v_item.qty);
    v_subtotal := v_subtotal + v_variant.price * v_item.qty;
  end loop;

  -- Coupon
  select * into v_cd from public.coupon_discount(p_coupon, v_subtotal, true);
  if v_cd.error is not null then raise exception '%', v_cd.error using errcode = 'P0001'; end if;
  if v_cd.code is not null then
    update public.coupons set used_count = used_count + 1 where coupons.code = v_cd.code;
  end if;

  -- Shipping (after discount) and the final check against what the customer saw
  v_shipping := public.shipping_for(v_subtotal - v_cd.discount);
  v_total := v_subtotal - v_cd.discount + v_shipping;
  if p_expected_total is not null and p_expected_total <> v_total then
    raise exception 'Prices or stock changed while you were checking out. Please review the updated total and place your order again.'
      using errcode = 'P0001';
  end if;

  update public.orders
     set subtotal = v_subtotal, discount = v_cd.discount, shipping = v_shipping, total = v_total, coupon_code = v_cd.code
   where id = v_order_id;

  insert into public.order_events (order_id, status, note) values (v_order_id, 'pending', 'Order placed');
  return public.order_receipt(v_order_id);
end $$;

-- ───────────────────────── Stock follows status ─────────────────────────
-- cancelled                         → stock goes back
-- refunded before dispatch          → stock goes back
-- refunded after dispatch/delivery  → no change (inspect the return, then adjust stock by hand)
-- re-opened (back to an active status after stock went back) → stock is taken again
create or replace function public.on_order_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare it record;
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, status, created_by) values (new.id, new.status, auth.uid());

    if not old.stock_released
       and (new.status = 'cancelled' or (new.status = 'refunded' and old.status not in ('dispatched', 'delivered'))) then
      update public.product_variants v
         set stock = v.stock + i.qty
        from public.order_items i
       where i.order_id = new.id and i.variant_id = v.id;
      new.stock_released := true;

    elsif old.stock_released and new.status not in ('cancelled', 'refunded') then
      for it in select variant_id, qty, product_name, variant_label from public.order_items
                 where order_id = new.id and variant_id is not null order by variant_id loop
        update public.product_variants set stock = stock - it.qty where id = it.variant_id and stock >= it.qty;
        if not found then
          raise exception 'Not enough stock to re-open this order (% — %).', it.product_name, it.variant_label using errcode = 'P0001';
        end if;
      end loop;
      new.stock_released := false;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_status_change on public.orders;
create trigger orders_status_change before update of status on public.orders
  for each row execute function public.on_order_status_change();

-- ───────────────────────── Reviews: clear duplicate message ─────────────────────────
create or replace function public.submit_review(
  p_order_number text, p_phone text, p_product_slug text, p_rating int, p_body text, p_name text, p_city text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare v_order uuid; v_product uuid;
begin
  select o.id into v_order from public.orders o
   where o.order_number = upper(btrim(p_order_number)) and o.phone = public.normalize_pk_phone(p_phone) and o.status = 'delivered';
  if not found then raise exception 'We could not find a delivered order with these details.' using errcode = 'P0001'; end if;

  select p.id into v_product from public.products p
    join public.order_items i on i.product_id = p.id and i.order_id = v_order
   where p.slug = p_product_slug limit 1;
  if not found then raise exception 'This product is not part of that order.' using errcode = 'P0001'; end if;

  if exists (select 1 from public.reviews where order_id = v_order and product_id = v_product) then
    raise exception 'You have already reviewed this product for this order.' using errcode = 'P0001';
  end if;

  insert into public.reviews (product_id, order_id, name, city, rating, body)
  values (v_product, v_order, left(btrim(p_name), 60), left(nullif(btrim(coalesce(p_city, '')), ''), 60), p_rating, btrim(p_body));
  return 'Thank you — your review will appear once approved.';
end $$;

-- ───────────────────────── Shared rate limiter ─────────────────────────
create table if not exists public.rate_limits (
  key       text primary key,
  hits      int not null,
  reset_at  timestamptz not null
);
alter table public.rate_limits enable row level security;   -- no policies: only the server (secret key) uses it

create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (key, hits, reset_at)
  values (left(p_key, 200), 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    hits     = case when r.reset_at < now() then 1 else r.hits + 1 end,
    reset_at = case when r.reset_at < now() then excluded.reset_at else r.reset_at end
  returning hits into v_hits;
  if random() < 0.01 then delete from public.rate_limits where reset_at < now() - interval '1 hour'; end if;
  return v_hits <= p_limit;
end $$;

-- ───────────────────────── Table access (Data API) ─────────────────────────
-- Newer Supabase projects do not expose tables automatically, so grant exactly
-- what each role needs. Row Level Security (001) still decides which ROWS are visible.
grant usage on schema public to anon, authenticated;

-- Public catalogue (read-only)
grant select on public.categories, public.products, public.product_categories,
                public.product_variants, public.reviews, public.site_settings
  to anon, authenticated;

-- Signed-in users: RLS limits them to their own rows; admins/staff get everything (future admin dashboard).
grant select, insert, update, delete on
  public.profiles, public.site_settings, public.categories, public.products, public.product_categories,
  public.product_variants, public.coupons, public.orders, public.order_items, public.order_events,
  public.reviews, public.newsletter_subscribers
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Server (secret key)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;
    grant usage, select on all sequences in schema public to service_role;
  end if;
end $$;

-- ───────────────────────── Function permissions ─────────────────────────
-- Helpers are internal only.
revoke execute on function public.cart_items(jsonb)                     from public, anon, authenticated;
revoke execute on function public.shipping_for(int)                     from public, anon, authenticated;
revoke execute on function public.payment_methods()                     from public, anon, authenticated;
revoke execute on function public.coupon_discount(text, int, boolean)   from public, anon, authenticated;
revoke execute on function public.order_receipt(uuid)                   from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, int, int)        from public, anon, authenticated;
revoke execute on function public.on_order_status_change()              from public, anon, authenticated;

-- Public RPCs. 004_lockdown.sql later removes anon/authenticated once the
-- website uses SUPABASE_SECRET_KEY.
grant execute on function public.place_order(jsonb, jsonb, text, text, int, uuid)       to anon, authenticated;
grant execute on function public.quote_order(jsonb, text)                               to anon, authenticated;
grant execute on function public.submit_review(text, text, text, int, text, text, text) to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.place_order(jsonb, jsonb, text, text, int, uuid)       to service_role;
    grant execute on function public.quote_order(jsonb, text)                               to service_role;
    grant execute on function public.submit_review(text, text, text, int, text, text, text) to service_role;
    grant execute on function public.track_order(text, text)                                to service_role;
    grant execute on function public.subscribe_newsletter(text, text)                       to service_role;
    grant execute on function public.rate_limit_hit(text, int, int)                         to service_role;
    grant select, insert, update, delete on public.rate_limits                              to service_role;
  end if;
end $$;
