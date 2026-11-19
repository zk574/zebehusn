import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const db = new PGlite();
const M = "/home/claude/zebehusn/supabase/migrations/";
// ── Supabase stubs ──
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`);
const run = async (f) => { await db.exec(fs.readFileSync(M + f, "utf8")); };
await run("001_schema.sql"); await run("002_seed.sql");
await run("001_schema.sql"); await run("002_seed.sql"); // idempotent re-run
await db.exec(`grant usage on schema public to anon, authenticated;
  grant select on all tables in schema public to anon, authenticated;
  grant insert, update, delete on all tables in schema public to anon, authenticated;`); // Supabase default grants

const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const expectErr = async (sql, p, m) => { try { await db.query(sql, p); ok(false, m + " (no error)"); } catch (e) { ok(true, m + " → " + e.message); } };

ok((await one("select count(*)::int n from public.products")).n === 22, "22 products seeded");
ok((await one("select count(*)::int n from public.product_variants")).n === 25, "variants seeded");

const cust = { name: "Ali Khan", phone: "+92 300 1234567", city: "Lahore", address: "House 1, Street 2, DHA" };
const stock0 = (await one("select stock from product_variants where sku='NOE-50'")).stock;
const r = (await one("select public.place_order($1,$2,'cod') r", [JSON.stringify([{ sku: "NOE-50", qty: 2 }, { sku: "SFC-150", qty: 1 }]), JSON.stringify(cust)])).r;
ok(r.total === 2 * 12500 + 2400 && r.shipping === 0, "order priced server-side: " + JSON.stringify(r));
ok((await one("select stock from product_variants where sku='NOE-50'")).stock === stock0 - 2, "stock decremented");
const ord = await one("select * from orders where order_number=$1", [r.order_number]);
ok(ord.phone === "03001234567", "phone normalised");

const small = (await one("select public.place_order($1,$2,'cod') r", [JSON.stringify([{ sku: "CMT-100", qty: 1 }]), JSON.stringify(cust)])).r;
ok(small.shipping === 250 && small.total === 1000, "flat shipping under threshold");

const before = (await one("select count(*)::int n from orders")).n;
await expectErr("select public.place_order($1,$2,'cod')", [JSON.stringify([{ sku: "SFC-150", qty: 1 }, { sku: "RRK-1", qty: 13 }]), JSON.stringify(cust)], "oversell rejected");
ok((await one("select count(*)::int n from orders")).n === before, "failed order fully rolled back");
ok((await one("select stock from product_variants where sku='SFC-150'")).stock === 79, "partial stock change rolled back");
await expectErr("select public.place_order($1,$2,'cod')", [JSON.stringify([{ sku: "NOE-50", qty: 1 }]), JSON.stringify({ ...cust, phone: "12345" })], "bad phone rejected");
await expectErr("select public.place_order($1,$2,'card')", [JSON.stringify([{ sku: "NOE-50", qty: 1 }]), JSON.stringify(cust)], "disabled payment rejected");

await db.query("insert into coupons (code,kind,value,min_subtotal) values ('WELCOME10','percent',10,0)");
const c = (await one("select public.place_order($1,$2,'bank','welcome10') r", [JSON.stringify([{ sku: "GPS-30", qty: 1 }]), JSON.stringify(cust)])).r;
ok(c.discount === 590 && c.total === 5900 - 590 + 0, "coupon applied: " + JSON.stringify(c));
ok((await one("select payment_status from orders where order_number=$1", [c.order_number])).payment_status === "pending_verification", "bank order awaits verification");

const t = (await one("select public.track_order($1,'0300-1234567') t", [r.order_number.toLowerCase()])).t;
ok(t && t.status === "pending" && t.items.length === 2, "track_order works with formatted phone");
ok((await one("select public.track_order($1,'03119999999') t", [r.order_number])).t === null, "track_order hides order on wrong phone");

const s1 = (await one("select stock from product_variants where sku='NOE-50'")).stock;
await db.query("update orders set status='cancelled' where order_number=$1", [r.order_number]);
ok((await one("select stock from product_variants where sku='NOE-50'")).stock === s1 + 2, "cancel restores stock");
ok((await one("select count(*)::int n from order_events where order_id=$1", [ord.id])).n === 2, "status event logged");

await expectErr("select public.submit_review($1,$2,'gold-peptide-serum',5,'Lovely serum, my skin glows.','Ali')", [c.order_number, cust.phone], "review blocked before delivery");
await db.query("update orders set status='delivered' where order_number=$1", [c.order_number]);
await one("select public.submit_review($1,$2,'gold-peptide-serum',5,'Lovely serum, my skin glows.','Ali','Lahore')", [c.order_number, cust.phone]);
ok((await one("select review_count from products where slug='gold-peptide-serum'")).review_count === 0, "unapproved review not counted");
await db.query("update reviews set is_approved=true");
const pr = await one("select rating, review_count from products where slug='gold-peptide-serum'");
ok(pr.review_count === 1 && Number(pr.rating) === 5, "approved review updates rating");

// ── RLS as anonymous visitor ──
await db.exec("set role anon");
ok((await one("select count(*)::int n from orders")).n === 0, "anon cannot read orders");
ok((await one("select count(*)::int n from products")).n === 22, "anon can read products");
ok((await one("select count(*)::int n from site_settings where key='bank_details'")).n === 0, "anon cannot read bank details");
await expectErr("insert into orders (order_number,payment_method,customer_name,phone,city,address,subtotal,shipping,total) values ('X','cod','a','b','c','d',1,1,1)", [], "anon cannot insert orders directly");
const upd = await db.query("update product_variants set price=1 returning sku");
ok(upd.rows.length === 0, "anon price update affects 0 rows");
const anonOrder = (await one("select public.place_order($1,$2,'cod') r", [JSON.stringify([{ sku: "CMT-100", qty: 1 }]), JSON.stringify(cust)])).r;
ok(!!anonOrder.order_number, "anon can place order via RPC");
await db.exec("reset role");

// ── Admin role ──
const u = await one("insert into auth.users default values returning id");
ok(!!(await one("select role from profiles where id=$1", [u.id])), "profile auto-created on signup");
await db.exec(`set request.uid = '${u.id}'`); await db.exec("set role authenticated");
await expectErr("update profiles set role='admin' where id=auth.uid()", [], "customer cannot self-promote");
await db.exec("reset role"); await db.query("update profiles set role='admin' where id=$1", [u.id]);
await db.exec("set role authenticated");
ok((await one("select count(*)::int n from orders")).n >= 4, "admin can read all orders");
await db.exec("reset role");
console.log("done");
