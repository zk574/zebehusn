"use client";
import Link from "next/link";
import Image from "next/image";
import { useId } from "react";
import { Heart } from "lucide-react";
import clsx from "clsx";
import type { Product } from "@/lib/types";
import { formatPKR, discountPct } from "@/lib/format";
import { useShop } from "@/store/shop";
import { useHydrated } from "@/lib/use-cart-lines";
import { ProductVisual } from "./ProductVisual";
import { firstInStock, toCartLine } from "@/lib/cart-line";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const add = useShop((s) => s.add);
  const toggleWish = useShop((s) => s.toggleWish);
  const wished = useShop((s) => s.wishlist.includes(product.slug));
  const hydrated = useHydrated();
  // Unique per card: the same product can appear twice on a page (e.g. two rails).
  const visualId = `card-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const v = firstInStock(product) ?? product.variants[0];
  const off = discountPct(v.price, v.compareAt);
  const soldOut = v.stock <= 0;

  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-2xl border border-line bg-onyx">
        <div className="relative aspect-[4/5] overflow-hidden">
          {product.images[0] ? (
            <Image src={product.images[0]} alt={product.name} fill sizes="(max-width:768px) 50vw, 25vw" priority={priority} className="object-cover transition duration-[1.2s] ease-lux group-hover:scale-105" />
          ) : (
            <ProductVisual shape={product.shape} tint={product.tint} id={visualId} label={product.name} className="h-full w-full transition duration-[1.2s] ease-lux group-hover:scale-105" />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isNew && <Tag>New</Tag>}
            {product.bestseller && <Tag>Bestseller</Tag>}
            {off > 0 && <Tag gold>-{off}%</Tag>}
          </div>
        </div>
      </Link>
      <button
        onClick={() => toggleWish(product.slug)}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink/60 backdrop-blur transition hover:text-gold"
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={hydrated && wished}
      >
        <Heart size={16} className={clsx(hydrated && wished && "fill-gold text-gold")} />
      </button>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <Link href={`/products/${product.slug}`} className="font-display text-xl leading-tight hover:text-gold transition">{product.name}</Link>
          <p className="mt-1 text-xs text-mist line-clamp-1">{product.short}</p>
        </div>
        <div className="text-right text-sm whitespace-nowrap">
          <p>{formatPKR(v.price)}</p>
          {v.compareAt && v.compareAt > v.price && <p className="text-xs text-mist line-through">{formatPKR(v.compareAt)}</p>}
        </div>
      </div>
      <button
        disabled={soldOut}
        onClick={() => add(toCartLine(product, v))}
        className="mt-4 w-full rounded-full border border-white/15 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition hover:border-gold hover:bg-gold hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ivory"
      >
        {soldOut ? "Sold out" : product.variants.length > 1 ? `Add ${v.label}` : "Add to bag"}
      </button>
    </article>
  );
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span className={clsx("rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em]", gold ? "bg-gold text-ink" : "bg-ink/70 text-ivory backdrop-blur")}>
      {children}
    </span>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => <ProductCard key={p.slug} product={p} priority={i < 4} />)}
    </div>
  );
}
