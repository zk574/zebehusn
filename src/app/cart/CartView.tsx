"use client";
import Link from "next/link";
import { X } from "lucide-react";
import { useShop } from "@/store/shop";
import { useCartLines, useHydrated } from "@/lib/use-cart-lines";
import { formatPKR } from "@/lib/format";
import { Qty } from "@/components/layout/CartDrawer";
import { ProductVisual } from "@/components/product/ProductVisual";

export function CartView() {
  const hydrated = useHydrated();
  const { lines, subtotal, shipping, total } = useCartLines();
  const setQty = useShop((s) => s.setQty);
  const remove = useShop((s) => s.remove);
  if (!hydrated) return <div className="h-80" />;
  if (!lines.length) return (
    <div className="py-24 text-center"><p className="font-display text-3xl">Your bag is empty</p><Link href="/shop" className="btn-ghost mt-6">Discover the collection</Link></div>
  );
  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <li key={l.sku} className="flex gap-5 py-6">
            <Link href={`/products/${l.slug}`} className="w-24 shrink-0 overflow-hidden rounded-xl md:w-32"><ProductVisual shape={l.shape} tint={l.tint} id={`cv-${l.sku}`} /></Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <div><Link href={`/products/${l.slug}`} className="font-display text-2xl hover:text-gold">{l.name}</Link><p className="text-xs text-mist">{l.label} · {formatPKR(l.price)}</p></div>
                <button onClick={() => remove(l.sku)} aria-label={`Remove ${l.name}`} className="text-mist hover:text-danger"><X size={18} /></button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4"><Qty value={l.qty} onChange={(q) => setQty(l.sku, q)} max={l.stock} /><span>{formatPKR(l.total)}</span></div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="card-lux h-fit p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{formatPKR(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-mist">Shipping</dt><dd>{shipping ? formatPKR(shipping) : "Free"}</dd></div>
          <div className="hairline" />
          <div className="flex justify-between text-lg"><dt>Total</dt><dd className="text-gold">{formatPKR(total)}</dd></div>
        </dl>
        <Link href="/checkout" className="btn-gold mt-6 w-full">Proceed to checkout</Link>
        <Link href="/shop" className="mt-4 block text-center text-xs uppercase tracking-[0.2em] text-mist hover:text-gold">Continue shopping</Link>
      </aside>
    </div>
  );
}
