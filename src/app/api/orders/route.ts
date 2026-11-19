import { NextResponse } from "next/server";
import { z } from "zod";
import { db, rpcError, supabaseConfigured } from "@/lib/supabase/server";
import { cartSchema, priceCart, PricingError } from "@/lib/server/pricing";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  cart: cartSchema,
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(10).max(16),
    email: z.email().max(120).optional().or(z.literal("")),
    city: z.string().trim().min(2).max(60),
    address: z.string().trim().min(8, "Please enter your complete address.").max(300),
    postalCode: z.string().trim().max(10).optional().or(z.literal("")),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
  }),
  payment: z.enum(["cod", "bank"]),
  coupon: z.string().trim().max(30).optional().or(z.literal("")),
});

/**
 * Creates an order.
 * With Supabase: the `place_order` database function re-prices every line,
 * locks & decrements stock atomically and applies coupon/shipping rules.
 * Without Supabase (local dev): returns a verified quote to confirm on WhatsApp.
 */
export async function POST(req: Request) {
  if (!rateLimit(req, "orders", 5)) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order details." }, { status: 400 });
  const { cart, customer, payment, coupon } = parsed.data;

  if (!supabaseConfigured) {
    try {
      const priced = await priceCart(cart);
      const ref = "ZEH-DEV-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      return NextResponse.json({ persisted: false, order_number: ref, ...priced });
    } catch (e) {
      return NextResponse.json({ error: e instanceof PricingError ? e.message : "Something went wrong." }, { status: 409 });
    }
  }

  const { data, error } = await db().rpc("place_order", {
    p_items: cart.map(({ sku, qty }) => ({ sku, qty })),
    p_customer: {
      name: customer.name, phone: customer.phone, email: customer.email, city: customer.city,
      address: customer.address, postal_code: customer.postalCode, notes: customer.notes,
    },
    p_payment: payment,
    p_coupon: coupon || null,
  });
  if (error) {
    if (error.code !== "P0001") console.error("place_order failed", error);
    return NextResponse.json({ error: rpcError(error) }, { status: error.code === "P0001" ? 409 : 500 });
  }
  return NextResponse.json({ persisted: true, ...data });
}
