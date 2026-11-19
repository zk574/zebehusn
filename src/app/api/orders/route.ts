import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db, rpcError, supabaseConfigured } from "@/lib/supabase/server";
import { cartSchema, getQuote, PricingError } from "@/lib/server/pricing";
import { limitKey, rateLimit } from "@/lib/rate-limit";

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
  /** Total the customer saw on the checkout page — the order is refused if it differs. */
  expectedTotal: z.number().int().nonnegative().optional(),
  /** Same key on a retry → the database returns the first order instead of creating a second. */
  idempotencyKey: z.uuid().optional(),
});

const CHANGED = "Prices or stock changed while you were checking out. Please review the updated total and place your order again.";

/**
 * Creates an order.
 * With Supabase: `place_order` re-prices every line, locks & decrements stock
 * atomically, applies coupon/shipping rules and checks the expected total.
 * Without Supabase (local dev): returns a verified quote to confirm on WhatsApp.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(req, "orders", 5))) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order details." }, { status: 400 });
  const { cart, customer, payment, coupon, expectedTotal, idempotencyKey } = parsed.data;

  // Limits that can't be dodged by faking IP headers.
  const phone = customer.phone.replace(/\D/g, "").slice(-10);
  if (!(await limitKey(`orders-phone:${phone}`, 3, 10 * 60_000))) {
    return NextResponse.json({ error: "Too many orders for this phone number. Please wait a few minutes or message us on WhatsApp." }, { status: 429 });
  }
  if (!(await limitKey("orders-all", 60, 60_000))) {
    return NextResponse.json({ error: "We're receiving a lot of orders right now. Please try again in a minute." }, { status: 429 });
  }

  if (!supabaseConfigured) {
    try {
      const q = await getQuote(cart);
      if (q.problems.length) return NextResponse.json({ error: q.problems[0] }, { status: 409 });
      if (expectedTotal !== undefined && expectedTotal !== q.total) return NextResponse.json({ error: CHANGED }, { status: 409 });
      const ref = "ZEH-DEV-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      return NextResponse.json({ persisted: false, order_number: ref, payment_method: payment, ...q });
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
    p_expected_total: expectedTotal ?? null,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) {
    if (error.code !== "P0001") console.error("place_order failed", error);
    return NextResponse.json({ error: rpcError(error) }, { status: error.code === "P0001" ? 409 : 500 });
  }
  revalidateTag("catalog", "max"); // stock changed → refresh product pages in the background
  return NextResponse.json({ persisted: true, ...data });
}
