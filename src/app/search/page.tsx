import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogView, parseSort } from "@/components/product/CatalogView";
import { getCategories, getProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

async function Inner({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const sort = parseSort(sp.sort);
  const [products, categories] = await Promise.all([q ? getProducts({ q, sort }) : Promise.resolve([]), getCategories()]);
  return (
    <CatalogView eyebrow="Search results" title={q ? `“${q}”` : "Search"} description={q ? undefined : "Use the search icon above to find a product."}
      products={products} categories={categories} sort={sort} basePath={`/search?q=${encodeURIComponent(q)}`} />
  );
}

export default function SearchPage(props: Parameters<typeof Inner>[0]) {
  return (
    <Suspense fallback={<div className="container-lux min-h-[70vh] pt-20"><div className="h-16 w-64 animate-pulse rounded bg-white/5" /></div>}>
      <Inner {...props} />
    </Suspense>
  );
}
