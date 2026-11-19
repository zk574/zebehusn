import "server-only";
import { db, usingSecretKey } from "@/lib/supabase/server";

/**
 * Client IP as seen by our hosting proxy.
 * The LEFT-most X-Forwarded-For entry is whatever the visitor typed, so it can't be
 * trusted. Proxies append the address they actually saw on the RIGHT, and hosts
 * like Vercel/Netlify set x-real-ip themselves.
 * Without such a proxy in front, any IP header can be faked — so sensitive routes
 * also use limits that don't depend on the IP (see limitKey).
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.length ? xff[xff.length - 1] : "unknown";
}

/* In-memory fallback (per server instance) — used only when the shared store isn't available. */
const hits = new Map<string, { n: number; reset: number }>();
function memoryHit(k: string, limit: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(k);
  if (!h || h.reset < now) { hits.set(k, { n: 1, reset: now + windowMs }); return true; }
  h.n += 1;
  if (hits.size > 5000) for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
  return h.n <= limit;
}

/**
 * Returns true when the request is allowed.
 * Uses the shared Supabase store (all server instances count together) when the
 * secret key is configured; otherwise a best-effort in-memory counter.
 */
export async function rateLimit(req: Request, bucket: string, limit = 10, windowMs = 60_000): Promise<boolean> {
  return limitKey(`${bucket}:${clientIp(req)}`, limit, windowMs);
}

/** Same as rateLimit, for any key (e.g. a phone number, or one site-wide counter). */
export async function limitKey(k: string, limit: number, windowMs = 60_000): Promise<boolean> {
  if (usingSecretKey) {
    const { data, error } = await db().rpc("rate_limit_hit", { p_key: k, p_limit: limit, p_window_seconds: Math.ceil(windowMs / 1000) });
    if (!error) return data === true;
    console.error("rate_limit_hit failed; using in-memory limiter:", error.message);
  }
  return memoryHit(k, limit, windowMs);
}
