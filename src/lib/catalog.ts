/**
 * Catalogue data access layer (server only).
 * • Supabase configured → reads live data (cached, tag "catalog").
 * • Not configured      → sample catalogue from seed.ts (local development only).
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { categories as seedCategories, products as seedProducts } from "./seed";
import type { Category, Product, Review } from "./types";
import { db, supabaseConfigured } from "./supabase/server";

export type SortKey = "featured" | "price-asc" | "price-desc" | "new";

/* ───────────────────────── Loading ───────────────────────── */

type Row = Record<string, unknown> & {
  product_variants?: { sku: string; label: string; price: number; compare_at: number | null; stock: number; sort: number }[];
  product_categories?: { categories: { slug: string } | null }[];
};

function mapProduct(r: Row): Product {
  return {
    slug: r.slug as string,
    name: r.name as string,
    categories: (r.product_categories ?? []).map((pc) => pc.categories?.slug).filter(Boolean) as string[],
    gender: r.gender as Product["gender"],
    shape: r.shape as Product["shape"],
    tint: r.tint as string,
    short: r.short as string,
    description: r.description as string,
    specs: (r.specs as [string, string][]) ?? [],
    ingredients: (r.ingredients as string) ?? undefined,
    usage: r.usage as string,
    variants: [...(r.product_variants ?? [])]
      .sort((a, b) => a.sort - b.sort)
      .map((v) => ({ sku: v.sku, label: v.label, price: v.price, compareAt: v.compare_at ?? undefined, stock: v.stock })),
    images: (r.images as string[]) ?? [],
    videoUrl: (r.video_url as string) ?? undefined,
    modelUrl: (r.model_url as string) ?? undefined,
    featured: r.featured as boolean,
    bestseller: r.bestseller as boolean,
    isNew: r.is_new as boolean,
    tags: (r.tags as string[]) ?? [],
    rating: Number(r.rating ?? 0),
    reviewCount: (r.review_count as number) ?? 0,
    frequentlyBoughtWith: (r.frequently_bought_with as string[]) ?? [],
  };
}

async function loadCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");

  if (!supabaseConfigured) return { products: seedProducts, categories: seedCategories };

  const [p, c] = await Promise.all([
    db()
      .from("products")
      .select("*, product_variants(sku,label,price,compare_at,stock,sort), product_categories(categories(slug))")
      .order("sort"),
    db().from("categories").select("slug,name,tagline,description,tint,sort").order("sort"),
  ]);
  if (p.error || c.error) {
    console.error("Catalogue load failed; using sample catalogue:", p.error?.message || c.error?.message);
    return { products: seedProducts, categories: seedCategories };
  }
  return {
    products: (p.data as Row[]).map(mapProduct).filter((x) => x.variants.length > 0),
    categories: c.data as Category[],
  };
}

/* ───────────────────────── Queries ───────────────────────── */

export async function getCategories(): Promise<Category[]> {
  return (await loadCatalog()).categories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function getProducts(opts: {
  category?: string; q?: string; sort?: SortKey; flag?: "featured" | "bestseller" | "isNew"; limit?: number;
} = {}): Promise<Product[]> {
  let list = [...(await loadCatalog()).products];
  if (opts.category) list = list.filter((p) => p.categories.includes(opts.category!));
  if (opts.flag) list = list.filter((p) => p[opts.flag!]);
  if (opts.q) {
    const q = opts.q.toLowerCase().trim();
    list = list.filter((p) => [p.name, p.short, p.description, ...p.tags, ...p.categories].join(" ").toLowerCase().includes(q));
  }
  switch (opts.sort) {
    case "price-asc": list.sort((a, b) => minPrice(a) - minPrice(b)); break;
    case "price-desc": list.sort((a, b) => minPrice(b) - minPrice(a)); break;
    case "new": list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew)); break;
    default: list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }
  return opts.limit ? list.slice(0, opts.limit) : list;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await loadCatalog()).products.find((p) => p.slug === slug);
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  const all = (await loadCatalog()).products;
  return slugs.map((s) => all.find((p) => p.slug === s)).filter(Boolean) as Product[];
}

export async function getRelated(product: Product, limit = 4): Promise<Product[]> {
  return (await loadCatalog()).products
    .filter((p) => p.slug !== product.slug && p.categories.some((c) => product.categories.includes(c)))
    .slice(0, limit);
}

/** Approved, verified-purchase reviews. Optionally for one product. */
export async function getReviews(productSlug?: string, limit = 6): Promise<Review[]> {
  "use cache";
  cacheTag("reviews");
  cacheLife("minutes");
  if (!supabaseConfigured) return [];
  let q = db()
    .from("reviews")
    .select("name, city, rating, body, created_at, products!inner(slug, name)")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (productSlug) q = q.eq("products.slug", productSlug);
  const { data, error } = await q;
  if (error) {
    console.error("Reviews load failed; using no reviews:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const prod = (Array.isArray(r.products) ? r.products[0] : r.products) as { slug: string; name: string };
    return { name: r.name, city: r.city ?? "", rating: r.rating, body: r.body, date: r.created_at, productSlug: prod.slug, productName: prod.name };
  });
}

export function minPrice(p: Product) {
  return Math.min(...p.variants.map((v) => v.price));
}
