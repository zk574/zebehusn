import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getCategories, getProducts } from "@/lib/catalog";
import { posts } from "@/lib/journal";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
  const statics = ["", "/shop", "/about", "/our-story", "/contact", "/faq", "/journal", "/reviews", "/shipping-returns", "/privacy-policy", "/terms", "/track-order"];
  return [
    ...statics.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...cats.map((c) => ({ url: `${site.url}/collections/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...prods.map((p) => ({ url: `${site.url}/products/${p.slug}`, changeFrequency: "daily" as const, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${site.url}/journal/${p.slug}`, lastModified: p.date, priority: 0.5 })),
  ];
}
