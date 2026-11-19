import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogView, parseSort } from "@/components/product/CatalogView";
import { getCategories, getProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop All", description: "Fragrances, skincare, haircare, bodycare and grooming essentials.", alternates: { canonical: "/shop" } };

async function Inner({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sort = parseSort((await searchParams).sort);
  const [products, categories] = await Promise.all([getProducts({ sort }), getCategories()]);
  return <CatalogView eyebrow="The House" title="Shop All" products={products} categories={categories} sort={sort} basePath="/shop" />;
}

export default function ShopPage(props: Parameters<typeof Inner>[0]) {
  return (
    <Suspense fallback={<div className="container-lux min-h-[70vh] pt-20"><div className="h-16 w-64 animate-pulse rounded bg-white/5" /></div>}>
      <Inner {...props} />
    </Suspense>
  );
}
