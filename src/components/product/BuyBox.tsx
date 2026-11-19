"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Heart, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPKR, discountPct } from "@/lib/format";
import { useShop } from "@/store/shop";
import { useHydrated } from "@/lib/use-cart-lines";
import { Qty } from "@/components/layout/CartDrawer";
import { site } from "@/config/site";
import { toCartLine } from "@/lib/cart-line";

export function BuyBox({ product }: { product: Product }) {
  const [sku, setSku] = useState(product.variants.find((v) => v.stock > 0)?.sku ?? product.variants[0].sku);
  const [qty, setQty] = useState(1);
  const add = useShop((s) => s.add);
  const toggleWish = useShop((s) => s.toggleWish);
  const setCartOpen = useShop((s) => s.setCartOpen);
  const wished = useShop((s) => s.wishlist.includes(product.slug));
  const hydrated = useHydrated();
  const router = useRouter();
  const v = product.variants.find((x) => x.sku === sku)!;
  const off = discountPct(v.price, v.compareAt);
  const inStock = v.stock > 0;

  const buyNow = () => {
    add(toCartLine(product, v, qty));
    setCartOpen(false);
    router.push("/checkout");
  };

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl">{formatPKR(v.price)}</span>
        {off > 0 && <><span className="text-mist line-through">{formatPKR(v.compareAt!)}</span><span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">-{off}%</span></>}
      </div>
      <p className="mt-1 text-xs text-mist">Inclusive of all taxes</p>

      {product.variants.length > 1 && (
        <fieldset className="mt-8">
          <legend className="eyebrow mb-3">Size</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((x) => (
              <button key={x.sku} onClick={() => { setSku(x.sku); setQty(1); }} disabled={x.stock <= 0} aria-pressed={x.sku === sku}
                className={clsx("rounded-full border px-5 py-2.5 text-sm transition disabled:line-through disabled:opacity-40", x.sku === sku ? "border-gold text-gold" : "border-white/15 hover:border-white/40")}>
                {x.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className={clsx("mt-6 text-xs", inStock ? (v.stock <= 5 ? "text-gold" : "text-success") : "text-danger")}>
        {inStock ? (v.stock <= 5 ? `Only ${v.stock} left in stock` : "In stock — ships in 24 hours") : "Out of stock"}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Qty value={qty} onChange={setQty} max={v.stock} />
        <button onClick={() => add(toCartLine(product, v, qty))} disabled={!inStock} className="btn-gold flex-1">Add to bag</button>
        <button onClick={() => toggleWish(product.slug)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 hover:border-gold" aria-label="Toggle wishlist" aria-pressed={hydrated && wished}>
          <Heart size={18} className={clsx(hydrated && wished && "fill-gold text-gold")} />
        </button>
      </div>
      <button onClick={buyNow} disabled={!inStock} className="btn-ghost mt-3 w-full">Buy now</button>
      <p className="mt-2 text-[11px] text-mist">SKU: {v.sku}</p>

      <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-ivory/80">
        <li className="flex gap-3"><Truck size={18} className="text-gold" /> Free delivery over Rs {site.shipping.freeOver.toLocaleString()} · 2–5 working days</li>
        <li className="flex gap-3"><ShieldCheck size={18} className="text-gold" /> Cash on Delivery available nationwide</li>
        <li className="flex gap-3"><RotateCcw size={18} className="text-gold" /> 7-day returns on unopened products</li>
      </ul>
    </div>
  );
}
