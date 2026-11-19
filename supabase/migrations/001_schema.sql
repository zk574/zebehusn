-- ═══════════════════════════════════════════════════════════════════════
-- Zeb-e-Husn — Stage 4 database schema
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── Profiles & roles ─────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  created_at  timestamptz not null default now()
);

-- Every new sign-up gets a profile row (role = customer).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the signed-in user is admin or staff. Used by every admin policy.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- Customers may not promote themselves: only admins (or the project owner in the
-- SQL Editor / service role) can change `role`. Not SECURITY DEFINER on purpose,
-- so current_user is the real caller.
create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Not allowed to change role';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ───────────────────────── Shared helpers ─────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────────────────── Site settings ─────────────────────────
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('shipping', '{"flat_rate": 250, "free_over": 5000}'),
  ('payments', '{"cod": true, "bank": true, "card": false, "wallet": false}'),
  ('bank_details', '{"bank": "", "account_title": "", "iban": ""}'),
  ('ad_video', '{"src": "", "poster": "", "headline": "A ritual, distilled."}')
on conflict (key) do nothing;

-- ───────────────────────── Catalogue ─────────────────────────
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null,
  tagline      text not null default '',
  description  text not null default '',
  tint         text not null default '#c9a45c',
  image_url    text,
  sort         int  not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.products (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name                   text not null,
  short                  text not null default '',
  description            text not null default '',
  gender                 text not null default 'unisex' check (gender in ('men', 'women', 'unisex')),
  shape                  text not null default 'jar' check (shape in ('perfume','tube','jar','pump','bar','kit','brush','dropper')),
  tint                   text not null default '#c9a45c',
  specs                  jsonb not null default '[]',        -- [["Label","Value"], …]
  ingredients            text,
  usage                  text not null default '',
  images                 text[] not null default '{}',
  video_url              text,
  model_url              text,                               -- GLB for the 3D viewer
  featured               boolean not null default false,
  bestseller             boolean not null default false,
  is_new                 boolean not null default false,
  tags                   text[] not null default '{}',
  frequently_bought_with text[] not null default '{}',        -- product slugs
  rating                 numeric(2,1) not null default 0,
  review_count           int not null default 0,
  seo_title              text,
  seo_description        text,
  is_active              boolean not null default true,
  sort                   int not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists public.product_categories (
  product_id   uuid not null references public.products(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  sku         text not null unique,
  label       text not null,
  price       int  not null check (price >= 0),                -- PKR, whole rupees
  compare_at  int  check (compare_at is null or compare_at >= 0),
  stock       int  not null default 0 check (stock >= 0),
  sort        int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);
create index if not exists product_categories_category_idx on public.product_categories(category_id);

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists variants_touch on public.product_variants;
create trigger variants_touch before update on public.product_variants for each row execute function public.touch_updated_at();

-- ───────────────────────── Coupons ─────────────────────────
create table if not exists public.coupons (
  code          text primary key check (code = upper(code)),
  kind          text not null check (kind in ('percent', 'fixed')),
  value         int  not null check (value > 0),
  min_subtotal  int  not null default 0,
  starts_at     timestamptz,
  ends_at       timestamptz,
  max_uses      int,
  used_count    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ───────────────────────── Orders ─────────────────────────
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  user_id          uuid references auth.users(id) on delete set null,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','processing','dispatched','delivered','cancelled','refunded')),
  payment_method   text not null check (payment_method in ('cod','bank','card','wallet')),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid','pending_verification','paid','refunded','failed')),
  customer_name    text not null,
  phone            text not null,
  email            text,
  city             text not null,
  address          text not null,
  postal_code      text,
  notes            text,
  coupon_code      text references public.coupons(code),
  subtotal         int not null,
  discount         int not null default 0,
  shipping         int not null,
  total            int not null,
  courier          text,
  tracking_number  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_phone_idx on public.orders(phone);
create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  variant_id     uuid references public.product_variants(id) on delete set null,
  product_id     uuid references public.products(id) on delete set null,
  sku            text not null,
  product_name   text not null,
  variant_label  text not null,
  unit_price     int not null,
  qty            int not null check (qty > 0),
  line_total     int not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- Status timeline shown on "Track my order" and in the admin.
create table if not exists public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      text not null,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- When an order's status changes: log it, and put stock back if it is cancelled.
create or replace function public.on_order_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, status, created_by) values (new.id, new.status, auth.uid());
    if new.status = 'cancelled' and old.status not in ('cancelled', 'refunded') then
      update public.product_variants v
         set stock = v.stock + i.qty
        from public.order_items i
       where i.order_id = new.id and i.variant_id = v.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_status_change on public.orders;
create trigger orders_status_change after update of status on public.orders
  for each row execute function public.on_order_status_change();

-- ───────────────────────── Reviews ─────────────────────────
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete set null,
  name         text not null,
  city         text,
  rating       int not null check (rating between 1 and 5),
  body         text not null check (char_length(body) between 10 and 1500),
  is_approved  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (order_id, product_id)                                  -- one review per product per order
);
create index if not exists reviews_product_idx on public.reviews(product_id) where is_approved;

-- Keep products.rating / review_count in sync with APPROVED reviews only.
create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where product_id = pid and is_approved), 0),
    review_count = (select count(*) from public.reviews where product_id = pid and is_approved)
  where p.id = pid;
  return null;
end $$;

drop trigger if exists reviews_rating on public.reviews;
create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ───────────────────────── Newsletter ─────────────────────────
create table if not exists public.newsletter_subscribers (
  email       text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source      text not null default 'website',
  created_at  timestamptz not null default now()
);

-- ═══════════════════════ Row Level Security ═══════════════════════
alter table public.profiles               enable row level security;
alter table public.site_settings          enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.product_categories     enable row level security;
alter table public.product_variants       enable row level security;
alter table public.coupons                enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_events           enable row level security;
alter table public.reviews                enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Profiles: users see/edit their own; admins see all.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or public.is_admin());

-- Public, read-only settings (bank details are only revealed via place_order).
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select using (key <> 'bank_details' or public.is_admin());
drop policy if exists settings_admin_write on public.site_settings;
create policy settings_admin_write on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- Catalogue: everyone reads active rows; admins manage everything.
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (is_active or public.is_admin());
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (is_active or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_categories_read on public.product_categories;
create policy product_categories_read on public.product_categories for select using (true);
drop policy if exists product_categories_admin on public.product_categories;
create policy product_categories_admin on public.product_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants for select using (is_active or public.is_admin());
drop policy if exists variants_admin on public.product_variants;
create policy variants_admin on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

-- Coupons: never listed publicly (validated inside place_order).
drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- Orders: no public insert (orders are created only through place_order).
drop policy if exists orders_own_or_admin on public.orders;
create policy orders_own_or_admin on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists order_events_read on public.order_events;
create policy order_events_read on public.order_events for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- Reviews: approved ones are public; submissions go through submit_review.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (is_approved or public.is_admin());
drop policy if exists reviews_admin on public.reviews;
create policy reviews_admin on public.reviews for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists newsletter_admin on public.newsletter_subscribers;
create policy newsletter_admin on public.newsletter_subscribers for select using (public.is_admin());

-- ═══════════════════════ Public RPC functions ═══════════════════════

-- Normalise Pakistani mobile numbers to 03XXXXXXXXX.
create or replace function public.normalize_pk_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d ~ '^923\d{9}$' then '0' || substr(d, 3)
    when d ~ '^03\d{9}$'  then d
    else null end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s;
$$;

/*
  place_order — the ONLY way an order can be created.
  • Re-prices every line from the database (client prices are ignored).
  • Locks each variant row and decrements stock atomically → no overselling.
  • Applies coupon + shipping rules server-side.
  p_items    : [{"sku": "NOE-50", "qty": 2}, …]
  p_customer : {"name","phone","email","city","address","postal_code","notes"}
*/
create or replace function public.place_order(
  p_items jsonb, p_customer jsonb, p_payment text, p_coupon text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id   uuid;
  v_number     text;
  v_subtotal   int := 0;
  v_discount   int := 0;
  v_shipping   int;
  v_ship       jsonb;
  v_payments   jsonb;
  v_coupon     public.coupons%rowtype;
  v_item       jsonb;
  v_variant    record;
  v_qty        int;
  v_phone      text := public.normalize_pk_phone(p_customer ->> 'phone');
  v_name       text := btrim(p_customer ->> 'name');
  v_city       text := btrim(p_customer ->> 'city');
  v_address    text := btrim(p_customer ->> 'address');
  v_email      text := nullif(btrim(coalesce(p_customer ->> 'email', '')), '');
  v_bank       jsonb;
begin
  -- Validate input
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your bag is empty.' using errcode = 'P0001';
  end if;
  if v_phone is null then raise exception 'Enter a valid Pakistani mobile number (03XXXXXXXXX).' using errcode = 'P0001'; end if;
  if v_name is null or char_length(v_name) not between 2 and 80 then raise exception 'Please enter your full name.' using errcode = 'P0001'; end if;
  if v_city is null or char_length(v_city) not between 2 and 60 then raise exception 'Please enter your city.' using errcode = 'P0001'; end if;
  if v_address is null or char_length(v_address) not between 8 and 300 then raise exception 'Please enter your complete address.' using errcode = 'P0001'; end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email.' using errcode = 'P0001'; end if;

  select value into v_payments from public.site_settings where key = 'payments';
  if p_payment not in ('cod', 'bank') or coalesce((v_payments ->> p_payment)::boolean, false) = false then
    raise exception 'This payment method is not available.' using errcode = 'P0001';
  end if;

  -- Order shell (totals filled in below)
  v_number := 'ZEH-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' ||
              upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.orders (order_number, user_id, payment_method, payment_status, customer_name, phone, email,
                             city, address, postal_code, notes, subtotal, shipping, total)
  values (v_number, auth.uid(), p_payment, case when p_payment = 'bank' then 'pending_verification' else 'unpaid' end,
          v_name, v_phone, v_email, v_city, v_address,
          left(nullif(btrim(coalesce(p_customer ->> 'postal_code', '')), ''), 10),
          left(nullif(btrim(coalesce(p_customer ->> 'notes', '')), ''), 300), 0, 0, 0)
  returning id into v_order_id;

  -- Lines: lock variant, check stock, decrement, snapshot price
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'Invalid quantity.' using errcode = 'P0001'; end if;

    select v.id, v.price, v.stock, v.label, v.sku, p.id as product_id, p.name
      into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.sku = v_item ->> 'sku' and v.is_active and p.is_active
       for update of v;

    if not found then raise exception 'An item in your bag is no longer available.' using errcode = 'P0001'; end if;
    if v_variant.stock < v_qty then
      raise exception 'Only % × % (%) left in stock.', v_variant.stock, v_variant.name, v_variant.label using errcode = 'P0001';
    end if;

    update public.product_variants set stock = stock - v_qty where id = v_variant.id;
    insert into public.order_items (order_id, variant_id, product_id, sku, product_name, variant_label, unit_price, qty, line_total)
    values (v_order_id, v_variant.id, v_variant.product_id, v_variant.sku, v_variant.name, v_variant.label,
            v_variant.price, v_qty, v_variant.price * v_qty);
    v_subtotal := v_subtotal + v_variant.price * v_qty;
  end loop;

  -- Coupon
  if nullif(btrim(coalesce(p_coupon, '')), '') is not null then
    select * into v_coupon from public.coupons where code = upper(btrim(p_coupon)) for update;
    if not found or not v_coupon.is_active
       or (v_coupon.starts_at is not null and now() < v_coupon.starts_at)
       or (v_coupon.ends_at is not null and now() > v_coupon.ends_at)
       or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses) then
      raise exception 'This coupon is not valid.' using errcode = 'P0001';
    end if;
    if v_subtotal < v_coupon.min_subtotal then
      raise exception 'This coupon needs a minimum order of Rs %.', v_coupon.min_subtotal using errcode = 'P0001';
    end if;
    v_discount := least(v_subtotal, case when v_coupon.kind = 'percent' then (v_subtotal * v_coupon.value) / 100 else v_coupon.value end);
    update public.coupons set used_count = used_count + 1 where code = v_coupon.code;
  end if;

  -- Shipping
  select value into v_ship from public.site_settings where key = 'shipping';
  v_shipping := case when v_subtotal - v_discount >= coalesce((v_ship ->> 'free_over')::int, 5000) then 0
                     else coalesce((v_ship ->> 'flat_rate')::int, 250) end;

  update public.orders
     set subtotal = v_subtotal, discount = v_discount, shipping = v_shipping,
         total = v_subtotal - v_discount + v_shipping,
         coupon_code = case when v_discount > 0 then v_coupon.code else null end
   where id = v_order_id;

  insert into public.order_events (order_id, status, note) values (v_order_id, 'pending', 'Order placed');

  if p_payment = 'bank' then select value into v_bank from public.site_settings where key = 'bank_details'; end if;

  return jsonb_build_object(
    'order_number', v_number,
    'subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping,
    'total', v_subtotal - v_discount + v_shipping,
    'payment_method', p_payment,
    'bank_details', v_bank
  );
end $$;

-- Track an order: requires BOTH the order number and the phone used at checkout.
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders
   where order_number = upper(btrim(p_order_number))
     and phone = public.normalize_pk_phone(p_phone);
  if not found then return null; end if;
  return jsonb_build_object(
    'order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status,
    'total', o.total, 'city', o.city, 'courier', o.courier, 'tracking_number', o.tracking_number,
    'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', product_name, 'variant', variant_label, 'qty', qty)), '[]')
                from public.order_items where order_id = o.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('status', status, 'note', note, 'at', created_at) order by created_at), '[]')
                 from public.order_events where order_id = o.id)
  );
end $$;

-- Verified-purchase reviews: order must be delivered and contain the product.
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

  insert into public.reviews (product_id, order_id, name, city, rating, body)
  values (v_product, v_order, left(btrim(p_name), 60), left(nullif(btrim(coalesce(p_city, '')), ''), 60), p_rating, btrim(p_body))
  on conflict (order_id, product_id) do nothing;
  return 'Thank you — your review will appear once approved.';
end $$;

create or replace function public.subscribe_newsletter(p_email text, p_source text default 'website')
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.newsletter_subscribers (email, source) values (lower(btrim(p_email)), left(coalesce(p_source, 'website'), 40))
  on conflict (email) do nothing;
  return true;
end $$;

-- Lock down function execution: public RPCs only.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text)                    to anon, authenticated;
grant execute on function public.track_order(text, text)                                  to anon, authenticated;
grant execute on function public.submit_review(text, text, text, int, text, text, text)   to anon, authenticated;
grant execute on function public.subscribe_newsletter(text, text)                         to anon, authenticated;
grant execute on function public.is_admin()                                               to anon, authenticated;
grant execute on function public.normalize_pk_phone(text)                                 to anon, authenticated;

-- ═══════════════════════ Storage buckets ═══════════════════════
-- Public-read buckets for product images/videos/3D models and site media.
insert into storage.buckets (id, name, public) values
  ('product-media', 'product-media', true),
  ('site-media',    'site-media',    true)
on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select
  using (bucket_id in ('product-media', 'site-media'));
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects for insert
  with check (bucket_id in ('product-media', 'site-media') and public.is_admin());
drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects for update
  using (bucket_id in ('product-media', 'site-media') and public.is_admin());
drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects for delete
  using (bucket_id in ('product-media', 'site-media') and public.is_admin());
