import "server-only";
import { z } from "zod";
import { getProduct } from "@/lib/catalog";
import { site } from "@/config/site";
import { db, supabaseConfigured } from "@/lib/supabase/server";
import type { Quote, QuoteLine } from "@/lib/types";

export const cartSchema = z.array(z.object({
  sku: z.string().min(1).max(40),
  slug: z.string().min(1).max(120),
  qty: z.number().int().min(1).max(20),
})).min(1).max(50);

export type CartInput = z.infer<typeof cartSchema>;

export class PricingError extends Error {}

/** Free shipping is judged on the amount AFTER discount — same rule as the database. */
export function shippingFor(amount: number) {
  return amount >= site.shipping.freeOver ? 0 : site.shipping.flatRate;
}

/**
 * Server-verified quote. Client prices are NEVER trusted.
 * • Supabase → quote_order() in the database (live prices, stock, coupons, payment switches)
 * • No Supabase (local dev) → sample catalogue; coupons are not available.
 */
export async function getQuote(cart: CartInput, coupon?: string): Promise<Quote> {
  if (supabaseConfigured) {
    const { data, error } = await db().rpc("quote_order", { p_items: cart.map(({ sku, qty }) => ({ sku, qty })), p_coupon: coupon || null });
    if (error) {
      if (error.code === "P0001") throw new PricingError(error.message);
      console.error("quote_order failed", error);
      throw new Error("quote_order failed");
    }
    return data as Quote;
  }

  // Merge repeated SKUs, like the database does.
  const merged = new Map<string, { slug: string; qty: number }>();
  for (const l of cart) {
    const m = merged.get(l.sku);
    merged.set(l.sku, { slug: l.slug, qty: (m?.qty ?? 0) + l.qty });
  }

  const lines: QuoteLine[] = [];
  const problems: string[] = [];
  for (const [sku, { slug, qty }] of merged) {
    const p = await getProduct(slug);
    const v = p?.variants.find((x) => x.sku === sku);
    if (!p || !v) { problems.push("An item in your bag is no longer available. Please remove it."); continue; }
    if (qty > 20) problems.push("You can order at most 20 of each item.");
    if (v.stock < qty) problems.push(v.stock === 0 ? `${p.name} (${v.label}) is out of stock. Please remove it.` : `Only ${v.stock} × ${p.name} (${v.label}) left in stock.`);
    lines.push({ sku, slug, name: p.name, variant: v.label, unit: v.price, qty, total: v.price * qty, stock: Math.min(v.stock, 20) });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const shipping = subtotal === 0 ? 0 : shippingFor(subtotal);
  return {
    lines, problems, subtotal, discount: 0, coupon: null,
    coupon_error: coupon ? "Coupons work once the database is connected." : null,
    shipping, total: subtotal + shipping, payments: { cod: true, bank: true },
  };
}
