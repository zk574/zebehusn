"use client";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useShop } from "@/store/shop";
import { ProductVisual } from "./ProductVisual";
import { firstInStock, toCartLine } from "@/lib/cart-line";

export function BoughtTogether({ main, others }: { main: Product; others: Product[] }) {
  const add = useShop((s) => s.add);
  // Only products (and sizes) that can actually be bought right now.
  const items = [main, ...others]
    .map((p) => ({ p, v: firstInStock(p) }))
    .filter((x): x is { p: Product; v: NonNullable<typeof x.v> } => !!x.v);
  if (items.length < 2 || items[0].p.slug !== main.slug) return null;
  const total = items.reduce((s, x) => s + x.v.price, 0);
  const addAll = () => items.forEach(({ p, v }) => add(toCartLine(p, v)));

  return (
    <section className="card-lux mt-16 p-6 md:p-10">
      <p className="eyebrow">Frequently Bought Together</p>
      <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3 overflow-x-auto">
          {items.map(({ p, v }, i) => (
            <div key={p.slug} className="flex items-center gap-3">
              {i > 0 && <span className="text-2xl text-gold">+</span>}
              <Link href={`/products/${p.slug}`} className="w-28 shrink-0">
                <div className="overflow-hidden rounded-xl"><ProductVisual shape={p.shape} tint={p.tint} id={`fbt-${p.slug}`} label={p.name} /></div>
                <p className="mt-2 text-xs leading-tight">{p.name}</p>
                <p className="text-xs text-mist">{formatPKR(v.price)}{p.variants.length > 1 ? ` · ${v.label}` : ""}</p>
              </Link>
            </div>
          ))}
        </div>
        <div className="md:w-64">
          <p className="text-sm text-mist">Total for {items.length} items</p>
          <p className="text-2xl">{formatPKR(total)}</p>
          <button onClick={addAll} className="btn-gold mt-4 w-full">Add all to bag</button>
        </div>
      </div>
    </section>
  );
}
