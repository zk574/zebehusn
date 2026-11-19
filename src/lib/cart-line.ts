import type { CartLine, Product, Variant } from "./types";

export function toCartLine(p: Product, v: Variant, qty = 1): CartLine {
  return { sku: v.sku, slug: p.slug, qty, name: p.name, label: v.label, price: v.price, stock: v.stock, shape: p.shape, tint: p.tint, image: p.images[0] ?? null };
}

/** First size that is in stock (undefined when the whole product is sold out). */
export function firstInStock(p: Product): Variant | undefined {
  return p.variants.find((v) => v.stock > 0);
}
