import "server-only";

/**
 * Best-effort in-memory rate limiter (per server instance).
 * Stage 8 replaces this with a shared store (e.g. Upstash Redis).
 */
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(req: Request, bucket: string, limit = 10, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const k = `${bucket}:${ip}`;
  const now = Date.now();
  const h = hits.get(k);
  if (!h || h.reset < now) { hits.set(k, { n: 1, reset: now + windowMs }); return true; }
  h.n += 1;
  if (hits.size > 5000) for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
  return h.n <= limit;
}
