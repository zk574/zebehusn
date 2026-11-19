import Link from "next/link";
import clsx from "clsx";
import type { Category, Product } from "@/lib/types";
import type { SortKey } from "@/lib/catalog";
import { ProductGrid } from "./ProductCard";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "new", label: "Newest" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
];

export function CatalogView({
  title, eyebrow, description, products, categories, activeCategory, sort, basePath,
}: {
  title: string; eyebrow: string; description?: string; products: Product[]; categories: Category[];
  activeCategory?: string; sort: SortKey; basePath: string;
}) {
  return (
    <div className="container-lux pt-12 md:pt-20">
      <header className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h-display mt-4 text-5xl md:text-7xl">{title}</h1>
        {description && <p className="mt-5 text-ivory/70">{description}</p>}
      </header>

      <nav aria-label="Categories" className="-mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0">
        <Chip href="/shop" active={!activeCategory}>All</Chip>
        {categories.map((c) => (
          <Chip key={c.slug} href={`/collections/${c.slug}`} active={activeCategory === c.slug}>{c.name}</Chip>
        ))}
      </nav>

      <div className="mt-8 flex items-center justify-between border-y border-line py-4 text-xs">
        <p className="text-mist">{products.length} {products.length === 1 ? "product" : "products"}</p>
        <div className="flex gap-3 md:gap-4">
          {SORTS.map((s) => (
            <Link key={s.key} href={`${basePath}${basePath.includes("?") ? "&" : "?"}sort=${s.key}`} scroll={false}
              className={clsx("whitespace-nowrap uppercase tracking-[0.1em] md:tracking-[0.15em] transition", sort === s.key ? "text-gold" : "text-mist hover:text-ivory")}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {products.length ? <ProductGrid products={products} /> : (
          <div className="py-24 text-center">
            <p className="font-display text-3xl">Nothing here yet</p>
            <Link href="/shop" className="btn-ghost mt-6">Browse everything</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={clsx("shrink-0 rounded-full border px-4 py-2 text-xs transition", active ? "border-gold bg-gold text-ink" : "border-white/15 text-ivory/80 hover:border-gold hover:text-gold")}>
      {children}
    </Link>
  );
}

export function parseSort(v: unknown): SortKey {
  return v === "new" || v === "price-asc" || v === "price-desc" ? v : "featured";
}
