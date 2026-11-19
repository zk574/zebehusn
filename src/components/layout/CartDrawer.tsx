"use client";
import Link from "next/link";
import { useCallback, useRef } from "react";
import clsx from "clsx";
import { Minus, Plus, X } from "lucide-react";
import { useShop } from "@/store/shop";
import { useCartLines, useHydrated } from "@/lib/use-cart-lines";
import { formatPKR } from "@/lib/format";
import { site } from "@/config/site";
import { ProductVisual } from "@/components/product/ProductVisual";
import { useDialog } from "@/lib/use-dialog";

export function CartDrawer() {
  const open = useShop((s) => s.cartOpen);
  const setOpen = useShop((s) => s.setCartOpen);
  const setQty = useShop((s) => s.setQty);
  const remove = useShop((s) => s.remove);
  const hydrated = useHydrated();
  const { lines, subtotal } = useCartLines();
  const remaining = Math.max(0, site.shipping.freeOver - subtotal);
  const panel = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDialog(panel, open, close);

  return (
    <div className={clsx("fixed inset-0 z-[70] transition", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={clsx("absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
      <aside
        ref={panel} tabIndex={-1}
        role="dialog" aria-modal="true" aria-label="Shopping bag"
        className={clsx("absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-onyx border-l border-line transition-transform duration-500 ease-lux", open ? "translate-x-0" : "translate-x-full")}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-display text-2xl">Your Bag</h2>
          <button onClick={() => setOpen(false)} aria-label="Close bag"><X /></button>
        </div>

        {hydrated && lines.length > 0 && (
          <div className="px-6 pt-4">
            <p className="text-xs text-mist">
              {remaining > 0 ? <>Add <span className="text-gold">{formatPKR(remaining)}</span> more for free delivery</> : <span className="text-gold">You&apos;ve unlocked free delivery</span>}
            </p>
            <div className="mt-2 h-1 rounded-full bg-white/10">
              <div className="h-1 rounded-full bg-gold transition-all" style={{ width: `${Math.min(100, (subtotal / site.shipping.freeOver) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!hydrated || lines.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="font-display text-2xl">Your bag is empty</p>
                <Link href="/shop" onClick={() => setOpen(false)} className="btn-ghost mt-6">Discover the collection</Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.sku} className="flex gap-4 py-4">
                  <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="w-20 shrink-0 overflow-hidden rounded-lg">
                    <ProductVisual shape={l.shape} tint={l.tint} id={`cd-${l.sku}`} />
                  </Link>
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="font-display text-lg leading-tight hover:text-gold">{l.name}</Link>
                      <button onClick={() => remove(l.sku)} className="text-mist hover:text-danger" aria-label={`Remove ${l.name}`}><X size={16} /></button>
                    </div>
                    <p className="text-xs text-mist">{l.label}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <Qty value={l.qty} onChange={(q) => setQty(l.sku, q)} max={l.stock} />
                      <span className="text-sm">{formatPKR(l.total)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hydrated && lines.length > 0 && (
          <div className="border-t border-line px-6 py-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-mist">Subtotal</span><span>{formatPKR(subtotal)}</span></div>
            <p className="text-[11px] text-mist">Shipping, coupons and final prices are confirmed at checkout.</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className="btn-gold w-full">Checkout</Link>
            <Link href="/cart" onClick={() => setOpen(false)} className="block text-center text-xs uppercase tracking-[0.2em] text-mist hover:text-gold">View full bag</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export function Qty({ value, onChange, max = 20 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/15">
      <button className="p-2 hover:text-gold disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button className="p-2 hover:text-gold disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= Math.min(max, 20)} aria-label="Increase quantity"><Plus size={14} /></button>
    </div>
  );
}
