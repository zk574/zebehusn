"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useShop } from "@/store/shop";
import { useHydrated } from "@/lib/use-cart-lines";
import { formatPKR } from "@/lib/format";
import { site } from "@/config/site";
import type { Quote } from "@/lib/types";
import { ProductVisual } from "@/components/product/ProductVisual";

const METHODS = [
  { id: "cod", label: "Cash on Delivery", note: "Pay the rider in cash. We confirm every COD order by phone/WhatsApp before dispatch.", live: true },
  { id: "bank", label: "Direct Bank Transfer", note: "Bank details are shared on confirmation. Your order ships once payment is verified.", live: true },
  { id: "card", label: "Debit / Credit Card", note: "Requires a payment-gateway merchant account (Safepay / PayFast) — Stage 6.", live: false },
  { id: "wallet", label: "JazzCash / Easypaisa", note: "Requires merchant credentials — Stage 6.", live: false },
] as const;

type Payment = "cod" | "bank";

type OrderResult = {
  persisted: boolean; order_number: string; subtotal: number; discount?: number; shipping: number; total: number;
  payment_method?: Payment;
  lines?: { name: string; variant: string; qty: number; total: number }[];
  bank_details?: { bank?: string; account_title?: string; iban?: string } | null;
};

function newKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback for non-secure (http) origins
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function CheckoutForm() {
  const hydrated = useHydrated();
  const cart = useShop((s) => s.cart);
  const clear = useShop((s) => s.clear);
  const syncFromQuote = useShop((s) => s.syncFromQuote);
  const [payment, setPayment] = useState<Payment>("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [coupon, setCoupon] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", city: "", address: "", postalCode: "", notes: "" });
  const set = (k: keyof typeof customer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer((c) => ({ ...c, [k]: e.target.value }));

  /* ── Server-verified quote (prices, stock, coupon, shipping, payment switches) ── */
  const [refresh, setRefresh] = useState(0);
  const items = useMemo(() => cart.map(({ sku, slug, qty }) => ({ sku, slug, qty })), [cart]);
  const itemsKey = JSON.stringify(items);
  const requestKey = JSON.stringify([itemsKey, coupon, refresh]);
  // The quote is "loading" whenever it doesn't belong to the current bag + coupon.
  const [fetched, setFetched] = useState<{ key: string; quote: Quote | null; error: string }>({ key: "", quote: null, error: "" });
  const quoteState: "loading" | "ok" | "error" = fetched.key !== requestKey ? "loading" : fetched.quote ? "ok" : "error";
  const quote = fetched.quote;
  const quoteError = fetched.error;

  useEffect(() => {
    if (!hydrated || !items.length) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cart: items, coupon }) });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(data.error);
        setFetched({ key: requestKey, quote: data, error: "" });
        syncFromQuote((data as Quote).lines);
      } catch (err) {
        if (!alive) return;
        setFetched({ key: requestKey, quote: null, error: err instanceof Error && err.message ? err.message : "Could not check prices. Please try again." });
      }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
    // requestKey covers items, coupon and refresh; syncFromQuote is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, requestKey]);

  const enabled = (id: string) => (id === "cod" || id === "bank") && !!quote?.payments[id];
  // If the selected method is switched off on the server, fall back to one that is on.
  const activePayment: Payment | null = quote ? (enabled(payment) ? payment : enabled("cod") ? "cod" : enabled("bank") ? "bank" : null) : payment;

  /* ── Idempotency: same details on a retry → same key → no duplicate order ── */
  const keyRef = useRef<string>("");
  const signature = JSON.stringify({ items, customer, activePayment, coupon });
  useEffect(() => { keyRef.current = ""; }, [signature]); // details changed → next submit is a new order

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote || !activePayment) return;
    keyRef.current ||= newKey();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: items, customer, payment: activePayment, coupon, expectedTotal: quote.total, idempotencyKey: keyRef.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setRefresh((n) => n + 1); // something changed → show the updated quote
        throw new Error(data.error);
      }
      setResult({ ...data, payment_method: data.payment_method ?? activePayment });
      if (data.persisted) clear();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not place your order. Please try again.");
    } finally { setBusy(false); }
  }

  if (!hydrated) return <div className="h-96" />;

  if (result?.persisted) {
    const b = result.bank_details;
    const wa = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Hi, I just placed order ${result.order_number}.`)}`;
    return (
      <div className="card-lux mx-auto max-w-xl p-8 text-center md:p-12">
        <p className="eyebrow">Thank you</p>
        <h2 className="h-display mt-4 text-4xl">Order received</h2>
        <p className="mt-3 font-display text-2xl text-gold">{result.order_number}</p>
        <dl className="mx-auto mt-8 max-w-xs space-y-2 text-left text-sm">
          <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{formatPKR(result.subtotal)}</dd></div>
          {!!result.discount && <div className="flex justify-between"><dt className="text-mist">Discount</dt><dd>−{formatPKR(result.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-mist">Shipping</dt><dd>{result.shipping ? formatPKR(result.shipping) : "Free"}</dd></div>
          <div className="flex justify-between text-base"><dt>Total</dt><dd className="text-gold">{formatPKR(result.total)}</dd></div>
        </dl>
        {result.payment_method === "cod" ? (
          <p className="mt-8 text-sm text-mist">We&apos;ll call or WhatsApp you on <span className="text-ivory">{customer.phone}</span> to confirm before dispatch. Please keep {formatPKR(result.total)} ready for the rider.</p>
        ) : (
          <div className="mt-8 rounded-xl border border-gold/30 p-5 text-left text-sm">
            <p className="eyebrow mb-3">Bank transfer details</p>
            {b?.iban ? (
              <><p>{b.bank}</p><p>{b.account_title}</p><p className="font-mono text-gold">{b.iban}</p></>
            ) : <p className="text-mist">Our team will send account details on WhatsApp.</p>}
            <p className="mt-3 text-xs text-mist">Use <span className="text-ivory">{result.order_number}</span> as the payment reference and send the receipt on WhatsApp. Your order ships once payment is verified.</p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-gold">Message us on WhatsApp</a>
          <Link href={`/track-order?order=${result.order_number}`} className="btn-ghost">Track this order</Link>
        </div>
        <p className="mt-6 text-xs text-mist">Save your order number — you&apos;ll need it with your phone number to track the order.</p>
      </div>
    );
  }

  if (result) {
    const msg = [
      `New order ${result.order_number}`,
      ...(result.lines ?? []).map((l) => `• ${l.qty} × ${l.name} (${l.variant}) — ${formatPKR(l.total)}`),
      `Subtotal: ${formatPKR(result.subtotal)}`, `Shipping: ${result.shipping ? formatPKR(result.shipping) : "Free"}`, `Total: ${formatPKR(result.total)}`,
      `Payment: ${result.payment_method === "bank" ? "Bank Transfer" : "Cash on Delivery"}`,
      `Name: ${customer.name}`, `Phone: ${customer.phone}`, `City: ${customer.city}`, `Address: ${customer.address}`,
      customer.notes ? `Notes: ${customer.notes}` : "",
    ].filter(Boolean).join("\n");
    const wa = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(msg)}`;
    return (
      <div className="card-lux mx-auto max-w-xl p-8 text-center md:p-12">
        <p className="eyebrow">Almost done</p>
        <h2 className="h-display mt-4 text-4xl">Confirm order {result.order_number}</h2>
        <p className="mt-4 text-sm text-mist">Your total of <span className="text-ivory">{formatPKR(result.total)}</span> has been verified. Send the order to our team on WhatsApp to confirm it — we&apos;ll reply with dispatch details{result.payment_method === "bank" ? " and bank account information" : ""}.</p>
        <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => clear()} className="btn-gold mt-8 w-full">Send order on WhatsApp</a>
        <button onClick={() => setResult(null)} className="mt-4 text-xs uppercase tracking-[0.2em] text-mist hover:text-gold">Edit details</button>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl">Your bag is empty</p>
        <Link href="/shop" className="btn-ghost mt-6">Continue shopping</Link>
      </div>
    );
  }

  const verified = quoteState === "ok" && quote;
  const problems = verified ? quote.problems : [];
  const canPlace = !!verified && problems.length === 0 && !!activePayment && !busy;

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-10">
        <fieldset>
          <legend className="font-display text-2xl">Delivery details</legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input className="input-lux sm:col-span-2" placeholder="Full name *" required value={customer.name} onChange={set("name")} autoComplete="name" />
            <input className="input-lux" placeholder="Mobile (03XXXXXXXXX) *" required inputMode="tel" value={customer.phone} onChange={set("phone")} autoComplete="tel" />
            <input className="input-lux" placeholder="Email (optional)" type="email" value={customer.email} onChange={set("email")} autoComplete="email" />
            <input className="input-lux" placeholder="City *" required value={customer.city} onChange={set("city")} autoComplete="address-level2" />
            <input className="input-lux" placeholder="Postal code" value={customer.postalCode} onChange={set("postalCode")} autoComplete="postal-code" />
            <textarea className="input-lux sm:col-span-2 min-h-24" placeholder="Complete address (house, street, area) *" required value={customer.address} onChange={set("address")} autoComplete="street-address" />
            <textarea className="input-lux sm:col-span-2" placeholder="Order notes (optional)" value={customer.notes} onChange={set("notes")} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-2xl">Payment</legend>
          <div className="mt-5 space-y-3">
            {METHODS.map((m) => {
              const on = m.live && (quote ? enabled(m.id) : true);
              return (
                <label key={m.id} className={clsx("flex gap-4 rounded-xl border p-4 transition", !on ? "cursor-not-allowed opacity-45" : "cursor-pointer", activePayment === m.id ? "border-gold bg-gold/5" : "border-white/10")}>
                  <input type="radio" name="payment" value={m.id} disabled={!on} checked={activePayment === m.id} onChange={() => on && setPayment(m.id as Payment)} className="mt-1 accent-[#c9a45c]" />
                  <span>
                    <span className="block text-sm font-semibold">{m.label}{!m.live ? " — coming soon" : !on ? " — currently unavailable" : ""}</span>
                    <span className="mt-1 block text-xs text-mist">{m.note}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside className="card-lux h-fit p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">Order summary</h2>
        <ul className="mt-5 space-y-4">
          {cart.map((l) => {
            const q = verified ? quote.lines.find((x) => x.sku === l.sku) : undefined;
            return (
              <li key={l.sku} className="flex items-center gap-3">
                <div className="relative w-14 shrink-0 overflow-hidden rounded-lg">
                  <ProductVisual shape={l.shape} tint={l.tint} id={`co-${l.sku}`} />
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-bold text-ink">{l.qty}</span>
                </div>
                <div className="flex-1 text-sm"><p>{l.name}</p><p className="text-xs text-mist">{l.label}</p></div>
                <span className="text-sm">{q ? formatPKR(q.total) : verified ? "—" : "…"}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-5">
          <label htmlFor="coupon" className="sr-only">Coupon code</label>
          <input id="coupon" className="input-lux uppercase" placeholder="Coupon code (optional)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase().trim())} maxLength={30} />
          {verified && quote.coupon_error && <p className="mt-2 text-xs text-danger">{quote.coupon_error}</p>}
          {verified && quote.coupon && <p className="mt-2 text-xs text-success">Coupon {quote.coupon} applied.</p>}
        </div>
        <div className="hairline my-5" />
        {verified ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{formatPKR(quote.subtotal)}</dd></div>
            {quote.discount > 0 && <div className="flex justify-between"><dt className="text-mist">Discount</dt><dd className="text-success">−{formatPKR(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-mist">Shipping</dt><dd>{quote.shipping ? formatPKR(quote.shipping) : "Free"}</dd></div>
            <div className="flex justify-between text-lg"><dt>Total</dt><dd className="text-gold">{formatPKR(quote.total)}</dd></div>
          </dl>
        ) : quoteState === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {quoteError}{" "}
            <button type="button" onClick={() => setRefresh((n) => n + 1)} className="underline">Try again</button>
          </p>
        ) : (
          <p className="text-sm text-mist" aria-live="polite">Checking latest prices and stock…</p>
        )}
        {problems.length > 0 && (
          <ul role="alert" className="mt-4 space-y-1 text-sm text-danger">
            {problems.map((p) => <li key={p}>{p}</li>)}
            <li><Link href="/cart" className="underline">Update your bag</Link></li>
          </ul>
        )}
        {verified && !activePayment && <p role="alert" className="mt-4 text-sm text-danger">No payment method is available right now. Please contact us on WhatsApp.</p>}
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        <button className="btn-gold mt-6 w-full disabled:opacity-50" disabled={!canPlace}>{busy ? "Placing order…" : "Place order"}</button>
        <p className="mt-3 text-center text-[11px] text-mist">These are live prices from our server. Your order is placed at exactly this total.</p>
      </aside>
    </form>
  );
}
