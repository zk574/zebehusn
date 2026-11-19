import "server-only";
import { z } from "zod";
import { getProduct } from "@/lib/catalog";
import { site } from "@/config/site";

export const cartSchema = z.array(z.object({
  sku: z.string().min(1).max(40),
  slug: z.string().min(1).max(120),
  qty: z.number().int().min(1).max(20),
})).min(1).max(50);

/**
 * Server-side price verification. Client prices are NEVER trusted:
 * every line is re-priced from the catalogue and stock is checked.
 */
export async function priceCart(lines: z.infer<typeof cartSchema>) {
  const out = [];
  for (const l of lines) {
    const p = await getProduct(l.slug);
    const v = p?.variants.find((x) => x.sku === l.sku);
    if (!p || !v) throw new PricingError(`Item ${l.sku} is no longer available.`);
    if (v.stock < l.qty) throw new PricingError(`Only ${v.stock} × ${p.name} (${v.label}) left in stock.`);
    out.push({ sku: v.sku, name: p.name, variant: v.label, qty: l.qty, unit: v.price, total: v.price * l.qty });
  }
  const subtotal = out.reduce((s, l) => s + l.total, 0);
  const shipping = subtotal >= site.shipping.freeOver ? 0 : site.shipping.flatRate;
  return { lines: out, subtotal, shipping, total: subtotal + shipping };
}

export class PricingError extends Error {}
