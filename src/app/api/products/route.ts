import { NextResponse } from "next/server";
import { getProductsBySlugs } from "@/lib/catalog";

/** Used by the wishlist (slugs live in the browser). */
export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  return NextResponse.json(await getProductsBySlugs(slugs));
}
