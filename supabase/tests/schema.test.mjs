// Database tests on PGlite (in-memory Postgres). Run: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const db = new PGlite();
const M = fileURLToPath(new URL("../migrations/", import.meta.url));

// ── Supabase stubs ──
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`);
const run = async (f) => { await db.exec(fs.readFileSync(M + f, "utf8")); };
const all = async () => { await run("001_schema.sql"); await run("002_seed.sql"); await run("003_hardening.sql"); };
await all(); await all(); // idempotent re-run
// No blanket "default grants" here on purpose: newer Supabase projects don't add them,
// so the migrations themselves must grant everything the site needs.

const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const expectErr = async (sql, p, m, match) => {
  try { await db.query(sql, p); ok(false, m + " (no error)"); }
  catch (e) { ok(!match || e.message.includes(match), m + " → " + e.message); }
};
const J = JSON.stringify;
const stock = async (sku) => (await one("select stock from product_variants where sku=$1", [sku])).stock;

ok((await one("select count(*)::int n from public.products")).n === 22, "22 products seeded");
ok((await one("select count(*)::int n from public.product_variants")).n === 25, "variants seeded");

const cust = { name: "Ali Khan", phone: "+92 300 1234567", city: "Lahore", address: "House 1, Street 2, DHA" };
const stock0 = await stock("NOE-50");
const r = (await one("select public.place_order($1,$2,'cod') r", [J([{ sku: "NOE-50", qty: 2 }, { sku: "SFC-150", qty: 1 }]), J(cust)])).r;
ok(r.total === 2 * 12500 + 2400 && r.shipping === 0, "order priced server-side: " + J(r));
ok((await stock("NOE-50")) === stock0 - 2, "stock decremented");
const ord = await one("select * from orders where order_number=$1", [r.order_number]);
ok(ord.phone === "03001234567", "phone normalised");

const small = (await one("select public.place_order($1,$2,'cod') r", [J([{ sku: "CMT-100", qty: 1 }]), J(cust)])).r;
ok(small.shipping === 250 && small.total === 1000, "flat shipping under threshold");

const before = (await one("select count(*)::int n from orders")).n;
await expectErr("select public.place_order($1,$2,'cod')", [J([{ sku: "SFC-150", qty: 1 }, { sku: "RRK-1", qty: 13 }]), J(cust)], "oversell rejected");
ok((await one("select count(*)::int n from orders")).n === before, "failed order fully rolled back");
ok((await stock("SFC-150")) === 79, "partial stock change rolled back");
await expectErr("select public.place_order($1,$2,'cod')", [J([{ sku: "NOE-50", qty: 1 }]), J({ ...cust, phone: "12345" })], "bad phone rejected");
await expectErr("select public.place_order($1,$2,'card')", [J([{ sku: "NOE-50", qty: 1 }]), J(cust)], "disabled payment rejected");
await expectErr("select public.place_order($1,$2,'cod')", [J([{ sku: "NOE-50", qty: "abc" }]), J(cust)], "non-numeric quantity rejected cleanly", "Invalid item");
await expectErr("select public.place_order($1,$2,'cod')", [J([{ sku: "NOE-50", qty: 15 }, { sku: "NOE-50", qty: 15 }]), J(cust)], "20-per-item cap can't be bypassed by repeating a line", "at most 20");

await db.query("insert into coupons (code,kind,value,min_subtotal) values ('WELCOME10','percent',10,0)");
const c = (await one("select public.place_order($1,$2,'bank','welcome10') r", [J([{ sku: "GPS-30", qty: 1 }]), J(cust)])).r;
ok(c.discount === 590 && c.total === 5900 - 590 + 0, "coupon applied: " + J(c));
ok((await one("select payment_status from orders where order_number=$1", [c.order_number])).payment_status === "pending_verification", "bank order awaits verification");
await expectErr("insert into coupons (code,kind,value) values ('HUGE','percent',150)", [], "percent coupon over 100 rejected");

// ── quote_order + shipping after discount ──
const q = (await one("select public.quote_order($1,'WELCOME10') q", [J([{ sku: "CNC-50", qty: 1 }, { sku: "SFC-150", qty: 1 }])])).q; // 4800 + 2400 = 7200
ok(q.subtotal === 7200 && q.discount === 720 && q.shipping === 0 && q.total === 6480, "quote shows verified prices + coupon: " + J(q));
const q2 = (await one("select public.quote_order($1,'WELCOME10') q", [J([{ sku: "CNC-50", qty: 1 }, { sku: "CMT-100", qty: 1 }])])).q;
ok(q2.shipping === 250 && q2.total === q2.subtotal - q2.discount + 250, "free shipping judged AFTER discount: " + J(q2));
const q3 = (await one("select public.quote_order($1,'NOPE') q", [J([{ sku: "RRK-1", qty: 13 }])])).q;
ok(q3.problems.length === 1 && q3.coupon_error === "This coupon is not valid.", "quote reports stock + coupon problems: " + J(q3.problems));
ok(q3.lines[0].stock <= 20, "quote never reveals more than 20 of stock");
ok(q.payments.cod === true && q.payments.bank === true, "quote reports enabled payment methods");

// ── expected total + idempotency ──
await expectErr("select public.place_order($1,$2,'cod',null,999)", [J([{ sku: "CMT-100", qty: 1 }]), J(cust)], "order refused when total differs from what customer saw", "Prices or stock changed");
const key = "6f1c2b9a-1d2e-4f00-9abc-1234567890ab";
const s2 = await stock("CMT-100");
const i1 = (await one("select public.place_order($1,$2,'cod',null,1000,$3) r", [J([{ sku: "CMT-100", qty: 1 }]), J(cust), key])).r;
const i2 = (await one("select public.place_order($1,$2,'cod',null,1000,$3) r", [J([{ sku: "CMT-100", qty: 1 }]), J(cust), key])).r;
ok(i1.order_number === i2.order_number, "retry with the same key returns the same order");
ok((await stock("CMT-100")) === s2 - 1, "retry did not take stock twice");

// ── tracking ──
const t = (await one("select public.track_order($1,'0300-1234567') t", [r.order_number.toLowerCase()])).t;
ok(t && t.status === "pending" && t.items.length === 2, "track_order works with formatted phone");
ok((await one("select public.track_order($1,'03119999999') t", [r.order_number])).t === null, "track_order hides order on wrong phone");

// ── stock follows status ──
const s1 = await stock("NOE-50");
await db.query("update orders set status='cancelled' where order_number=$1", [r.order_number]);
ok((await stock("NOE-50")) === s1 + 2, "cancel restores stock");
ok((await one("select count(*)::int n from order_events where order_id=$1", [ord.id])).n === 2, "status event logged");
await db.query("update orders set status='refunded' where order_number=$1", [r.order_number]);
ok((await stock("NOE-50")) === s1 + 2, "cancel → refund does not restock twice");
await db.query("update orders set status='confirmed' where order_number=$1", [r.order_number]);
ok((await stock("NOE-50")) === s1, "re-opening a cancelled order takes stock again");
const sm = await stock("CMT-100");
await db.query("update orders set status='refunded' where order_number=$1", [small.order_number]);
ok((await stock("CMT-100")) === sm + 1, "refund before dispatch restocks");
await db.query("update orders set status='dispatched' where order_number=$1", [i1.order_number]);
const sd = await stock("CMT-100");
await db.query("update orders set status='refunded' where order_number=$1", [i1.order_number]);
ok((await stock("CMT-100")) === sd, "refund after dispatch leaves stock for manual check");

// ── reviews ──
await expectErr("select public.submit_review($1,$2,'gold-peptide-serum',5,'Lovely serum, my skin glows.','Ali')", [c.order_number, cust.phone], "review blocked before delivery");
await db.query("update orders set status='delivered' where order_number=$1", [c.order_number]);
await one("select public.submit_review($1,$2,'gold-peptide-serum',5,'Lovely serum, my skin glows.','Ali','Lahore')", [c.order_number, cust.phone]);
ok((await one("select review_count from products where slug='gold-peptide-serum'")).review_count === 0, "unapproved review not counted");
await expectErr("select public.submit_review($1,$2,'gold-peptide-serum',4,'Second review attempt here.','Ali')", [c.order_number, cust.phone], "duplicate review gets a clear message", "already reviewed");
await db.query("update reviews set is_approved=true");
const pr = await one("select rating, review_count from products where slug='gold-peptide-serum'");
ok(pr.review_count === 1 && Number(pr.rating) === 5, "approved review updates rating");

// ── rate limiter ──
const hits = [];
for (let n = 0; n < 4; n++) hits.push((await one("select public.rate_limit_hit('test:1.2.3.4', 3, 60) ok")).ok);
ok(hits.join() === "true,true,true,false", "shared rate limiter blocks after the limit");

// ── RLS as anonymous visitor (before lockdown) ──
await db.exec("set role anon");
let anonOrders = 0;
try { anonOrders = (await one("select count(*)::int n from orders")).n; } catch { /* permission denied is fine */ }
ok(anonOrders === 0, "anon cannot read orders");
ok((await one("select count(*)::int n from products")).n === 22, "anon can read products");
ok((await one("select count(*)::int n from site_settings where key='bank_details'")).n === 0, "anon cannot read bank details");
await expectErr("insert into orders (order_number,payment_method,customer_name,phone,city,address,subtotal,shipping,total) values ('X','cod','a','b','c','d',1,1,1)", [], "anon cannot insert orders directly");
let priceChanged = false;
try { priceChanged = (await db.query("update product_variants set price=1 returning sku")).rows.length > 0; } catch { /* permission denied is fine */ }
ok(!priceChanged, "anon cannot change prices");
await expectErr("select public.rate_limit_hit('x', 1, 60)", [], "anon cannot call internal helpers");
const anonOrder = (await one("select public.place_order($1,$2,'cod') r", [J([{ sku: "CMT-100", qty: 1 }]), J(cust)])).r;
ok(!!anonOrder.order_number, "anon can place order via RPC (until 004 lockdown)");
await db.exec("reset role");

// ── Admin role ──
const u = await one("insert into auth.users default values returning id");
ok(!!(await one("select role from profiles where id=$1", [u.id])), "profile auto-created on signup");
await db.exec(`set request.uid = '${u.id}'`); await db.exec("set role authenticated");
await expectErr("update profiles set role='admin' where id=auth.uid()", [], "customer cannot self-promote");
await db.exec("reset role"); await db.query("update profiles set role='admin' where id=$1", [u.id]);
await db.exec("set role authenticated");
ok((await one("select count(*)::int n from orders")).n >= 4, "admin can read all orders");
await db.exec("reset role"); await db.exec("reset request.uid");

// ── 004 lockdown ──
await run("004_lockdown.sql"); await run("004_lockdown.sql");
await db.exec("set role anon");
await expectErr("select public.place_order($1,$2,'cod')", [J([{ sku: "CMT-100", qty: 1 }]), J(cust)], "after lockdown: anon cannot place orders directly", "permission denied");
await expectErr("select public.track_order('X','03001234567')", [], "after lockdown: anon cannot call track_order", "permission denied");
await expectErr("select stock from product_variants limit 1", [], "after lockdown: anon cannot read exact stock", "permission denied");
ok((await one("select count(*)::int n from product_variants where price > 0")).n === 25, "after lockdown: anon still reads prices");
await db.exec("reset role");
await db.exec("set role service_role");
const svc = (await one("select public.place_order($1,$2,'cod') r", [J([{ sku: "CMT-100", qty: 1 }]), J(cust)])).r;
ok(!!svc.order_number, "after lockdown: website (secret key) can place orders");
await db.exec("reset role");

console.log(process.exitCode ? "SOME CHECKS FAILED" : "done — all checks passed");
