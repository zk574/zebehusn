import type { CartLine, Product, Variant } from "./types";

export function toCartLine(p: Product, v: Variant, qty = 1): CartLine {
  return { sku: v.sku, slug: p.slug, qty, name: p.name, label: v.label, price: v.price, stock: v.stock, shape: p.shape, tint: p.tint, image: p.images[0] ?? null };
}
