"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useShop } from "@/store/shop";
import { useHydrated } from "@/lib/use-cart-lines";
import type { Product } from "@/lib/types";
import { ProductGrid } from "@/components/product/ProductCard";

export function WishlistView() {
  const hydrated = useHydrated();
  const wishlist = useShop((s) => s.wishlist);
  const [products, setProducts] = useState<Product[] | null>(null);
  const key = wishlist.join(",");

  useEffect(() => {
    if (!hydrated || !key) return;
    let alive = true;
    fetch(`/api/products?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: Product[]) => alive && setProducts(d))
      .catch(() => alive && setProducts([]));
    return () => { alive = false; };
  }, [hydrated, key]);

  if (!hydrated || (key && products === null)) return <div className="h-80" />;
  const list = key ? (products ?? []).filter((p) => wishlist.includes(p.slug)) : [];
  if (!list.length) return (
    <div className="py-24 text-center"><p className="font-display text-3xl">Nothing saved yet</p><p className="mt-2 text-sm text-mist">Tap the heart on any product to save it here.</p><Link href="/shop" className="btn-ghost mt-6">Browse the house</Link></div>
  );
  return <ProductGrid products={list} />;
}
