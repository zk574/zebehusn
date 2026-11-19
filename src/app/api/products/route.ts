import { NextResponse } from "next/server";
import { getProductsBySlugs } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";

/** Used by the wishlist (slugs live in the browser). */
export async function GET(req: Request) {
  if (!(await rateLimit(req, "products", 60))) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  return NextResponse.json(await getProductsBySlugs(slugs));
}
