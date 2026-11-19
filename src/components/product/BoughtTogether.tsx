"use client";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useShop } from "@/store/shop";
import { ProductVisual } from "./ProductVisual";
import { toCartLine } from "@/lib/cart-line";

export function BoughtTogether({ main, others }: { main: Product; others: Product[] }) {
  const add = useShop((s) => s.add);
  if (!others.length) return null;
  const all = [main, ...others];
  const total = all.reduce((s, p) => s + p.variants[0].price, 0);
  const addAll = () => all.forEach((p) => add(toCartLine(p, p.variants[0])));

  return (
    <section className="card-lux mt-16 p-6 md:p-10">
      <p className="eyebrow">Frequently Bought Together</p>
      <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3 overflow-x-auto">
          {all.map((p, i) => (
            <div key={p.slug} className="flex items-center gap-3">
              {i > 0 && <span className="text-2xl text-gold">+</span>}
              <Link href={`/products/${p.slug}`} className="w-28 shrink-0">
                <div className="overflow-hidden rounded-xl"><ProductVisual shape={p.shape} tint={p.tint} id={`fbt-${p.slug}`} label={p.name} /></div>
                <p className="mt-2 text-xs leading-tight">{p.name}</p>
                <p className="text-xs text-mist">{formatPKR(p.variants[0].price)}</p>
              </Link>
            </div>
          ))}
        </div>
        <div className="md:w-64">
          <p className="text-sm text-mist">Total for {all.length} items</p>
          <p className="text-2xl">{formatPKR(total)}</p>
          <button onClick={addAll} className="btn-gold mt-4 w-full">Add all to bag</button>
        </div>
      </div>
    </section>
  );
}
