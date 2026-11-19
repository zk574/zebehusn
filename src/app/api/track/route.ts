import { NextResponse } from "next/server";
import { z } from "zod";
import { db, rpcError, supabaseConfigured } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ order: z.string().trim().min(6).max(40), phone: z.string().trim().min(10).max(16) });

export async function POST(req: Request) {
  if (!rateLimit(req, "track", 10)) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  if (!supabaseConfigured) return NextResponse.json({ error: "Order tracking is not configured yet." }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your order number and phone number." }, { status: 400 });
  const { data, error } = await db().rpc("track_order", { p_order_number: parsed.data.order, p_phone: parsed.data.phone });
  if (error) return NextResponse.json({ error: rpcError(error) }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No order found with these details." }, { status: 404 });
  return NextResponse.json(data);
}
