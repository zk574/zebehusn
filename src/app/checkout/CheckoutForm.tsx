"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { useShop } from "@/store/shop";
import { useCartLines, useHydrated } from "@/lib/use-cart-lines";
import { formatPKR } from "@/lib/format";
import { site } from "@/config/site";
import { ProductVisual } from "@/components/product/ProductVisual";

const METHODS = [
  { id: "cod", label: "Cash on Delivery", note: "Pay the rider in cash. We confirm every COD order by phone/WhatsApp before dispatch.", enabled: true },
  { id: "bank", label: "Direct Bank Transfer", note: "Bank details are shared on confirmation. Your order ships once payment is verified.", enabled: true },
  { id: "card", label: "Debit / Credit Card", note: "Requires a payment-gateway merchant account (Safepay / PayFast) — Stage 6.", enabled: false },
  { id: "wallet", label: "JazzCash / Easypaisa", note: "Requires merchant credentials — Stage 6.", enabled: false },
] as const;

type Quote = {
  persisted: boolean; order_number: string; subtotal: number; discount?: number; shipping: number; total: number;
  lines?: { name: string; variant: string; qty: number; total: number }[];
  bank_details?: { bank?: string; account_title?: string; iban?: string } | null;
};

export function CheckoutForm() {
  const hydrated = useHydrated();
  const cart = useShop((s) => s.cart);
  const clear = useShop((s) => s.clear);
  const { lines, subtotal, shipping, total } = useCartLines();
  const [payment, setPayment] = useState<"cod" | "bank">("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", city: "", address: "", postalCode: "", notes: "" });
  const set = (k: keyof typeof customer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer((c) => ({ ...c, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: cart.map(({ sku, slug, qty }) => ({ sku, slug, qty })), customer, payment, coupon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuote(data);
      if (data.persisted) clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare your order.");
    } finally { setBusy(false); }
  }

  if (!hydrated) return <div className="h-96" />;

  if (quote?.persisted) {
    const b = quote.bank_details;
    const wa = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Hi, I just placed order ${quote.order_number}.`)}`;
    return (
      <div className="card-lux mx-auto max-w-xl p-8 text-center md:p-12">
        <p className="eyebrow">Thank you</p>
        <h2 className="h-display mt-4 text-4xl">Order received</h2>
        <p className="mt-3 font-display text-2xl text-gold">{quote.order_number}</p>
        <dl className="mx-auto mt-8 max-w-xs space-y-2 text-left text-sm">
          <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{formatPKR(quote.subtotal)}</dd></div>
          {!!quote.discount && <div className="flex justify-between"><dt className="text-mist">Discount</dt><dd>−{formatPKR(quote.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-mist">Shipping</dt><dd>{quote.shipping ? formatPKR(quote.shipping) : "Free"}</dd></div>
          <div className="flex justify-between text-base"><dt>Total</dt><dd className="text-gold">{formatPKR(quote.total)}</dd></div>
        </dl>
        {payment === "cod" ? (
          <p className="mt-8 text-sm text-mist">We&apos;ll call or WhatsApp you on <span className="text-ivory">{customer.phone}</span> to confirm before dispatch. Please keep {formatPKR(quote.total)} ready for the rider.</p>
        ) : (
          <div className="mt-8 rounded-xl border border-gold/30 p-5 text-left text-sm">
            <p className="eyebrow mb-3">Bank transfer details</p>
            {b?.iban ? (
              <><p>{b.bank}</p><p>{b.account_title}</p><p className="font-mono text-gold">{b.iban}</p></>
            ) : <p className="text-mist">Our team will send account details on WhatsApp.</p>}
            <p className="mt-3 text-xs text-mist">Use <span className="text-ivory">{quote.order_number}</span> as the payment reference and send the receipt on WhatsApp. Your order ships once payment is verified.</p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-gold">Message us on WhatsApp</a>
          <Link href={`/track-order?order=${quote.order_number}`} className="btn-ghost">Track this order</Link>
        </div>
        <p className="mt-6 text-xs text-mist">Save your order number — you&apos;ll need it with your phone number to track the order.</p>
      </div>
    );
  }

  if (quote) {
    const msg = [
      `New order ${quote.order_number}`,
      ...(quote.lines ?? []).map((l) => `• ${l.qty} × ${l.name} (${l.variant}) — ${formatPKR(l.total)}`),
      `Subtotal: ${formatPKR(quote.subtotal)}`, `Shipping: ${quote.shipping ? formatPKR(quote.shipping) : "Free"}`, `Total: ${formatPKR(quote.total)}`,
      `Payment: ${payment === "cod" ? "Cash on Delivery" : "Bank Transfer"}`,
      `Name: ${customer.name}`, `Phone: ${customer.phone}`, `City: ${customer.city}`, `Address: ${customer.address}`,
      customer.notes ? `Notes: ${customer.notes}` : "",
    ].filter(Boolean).join("\n");
    const wa = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(msg)}`;
    return (
      <div className="card-lux mx-auto max-w-xl p-8 text-center md:p-12">
        <p className="eyebrow">Almost done</p>
        <h2 className="h-display mt-4 text-4xl">Confirm order {quote.order_number}</h2>
        <p className="mt-4 text-sm text-mist">Your total of <span className="text-ivory">{formatPKR(quote.total)}</span> has been verified. Send the order to our team on WhatsApp to confirm it — we&apos;ll reply with dispatch details{payment === "bank" ? " and bank account information" : ""}.</p>
        <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => clear()} className="btn-gold mt-8 w-full">Send order on WhatsApp</a>
        <button onClick={() => setQuote(null)} className="mt-4 text-xs uppercase tracking-[0.2em] text-mist hover:text-gold">Edit details</button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl">Your bag is empty</p>
        <Link href="/shop" className="btn-ghost mt-6">Continue shopping</Link>
      </div>
    );
  }

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
            {METHODS.map((m) => (
              <label key={m.id} className={clsx("flex gap-4 rounded-xl border p-4 transition", !m.enabled ? "cursor-not-allowed opacity-45" : "cursor-pointer", payment === m.id ? "border-gold bg-gold/5" : "border-white/10")}>
                <input type="radio" name="payment" value={m.id} disabled={!m.enabled} checked={payment === m.id} onChange={() => m.enabled && setPayment(m.id as "cod" | "bank")} className="mt-1 accent-[#c9a45c]" />
                <span>
                  <span className="block text-sm font-semibold">{m.label}{!m.enabled && " — coming soon"}</span>
                  <span className="mt-1 block text-xs text-mist">{m.note}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="card-lux h-fit p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">Order summary</h2>
        <ul className="mt-5 space-y-4">
          {lines.map((l) => (
            <li key={l.sku} className="flex items-center gap-3">
              <div className="relative w-14 shrink-0 overflow-hidden rounded-lg">
                <ProductVisual shape={l.shape} tint={l.tint} id={`co-${l.sku}`} />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-bold text-ink">{l.qty}</span>
              </div>
              <div className="flex-1 text-sm"><p>{l.name}</p><p className="text-xs text-mist">{l.label}</p></div>
              <span className="text-sm">{formatPKR(l.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <label htmlFor="coupon" className="sr-only">Coupon code</label>
          <input id="coupon" className="input-lux uppercase" placeholder="Coupon code (optional)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={30} />
        </div>
        <div className="hairline my-5" />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{formatPKR(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-mist">Shipping</dt><dd>{shipping ? formatPKR(shipping) : "Free"}</dd></div>
          <div className="flex justify-between text-lg"><dt>Total</dt><dd className="text-gold">{formatPKR(total)}</dd></div>
        </dl>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        <button className="btn-gold mt-6 w-full" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
        <p className="mt-3 text-center text-[11px] text-mist">Prices, stock and any coupon are verified on our server when you place the order.</p>
      </aside>
    </form>
  );
}
