import { NextResponse } from "next/server";
import { z } from "zod";
import { cartSchema, getQuote, PricingError } from "@/lib/server/pricing";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  cart: cartSchema,
  coupon: z.string().trim().max(30).optional().or(z.literal("")),
});

/** Verified prices, stock, coupon, shipping and enabled payment methods for the checkout page. */
export async function POST(req: Request) {
  if (!(await rateLimit(req, "quote", 40))) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Your bag could not be read. Please refresh the page." }, { status: 400 });
  try {
    return NextResponse.json(await getQuote(parsed.data.cart, parsed.data.coupon));
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "Could not check prices right now. Please try again." }, { status: 500 });
  }
}
