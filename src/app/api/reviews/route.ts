import { NextResponse } from "next/server";
import { z } from "zod";
import { db, rpcError, supabaseConfigured } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  order: z.string().trim().min(6).max(40),
  phone: z.string().trim().min(10).max(16),
  product: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  name: z.string().trim().min(2).max(60),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Please write at least 10 characters.").max(1500),
});

export async function POST(req: Request) {
  if (!(await rateLimit(req, "reviews", 5))) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  if (!supabaseConfigured) return NextResponse.json({ error: "Reviews are not configured yet." }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your review." }, { status: 400 });
  const r = parsed.data;
  const { data, error } = await db().rpc("submit_review", {
    p_order_number: r.order, p_phone: r.phone, p_product_slug: r.product, p_rating: r.rating, p_body: r.body, p_name: r.name, p_city: r.city || null,
  });
  if (error) return NextResponse.json({ error: rpcError(error) }, { status: error.code === "P0001" ? 409 : 500 });
  return NextResponse.json({ message: data });
}
