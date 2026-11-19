import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
/** Server-only key (Supabase → Project Settings → API Keys → Secret key). Never expose it to the browser. */
const secretKey = process.env.SUPABASE_SECRET_KEY;

/** True when Supabase env vars are set. Without them the site runs on the sample catalogue (dev only). */
export const supabaseConfigured = Boolean(url && (secretKey || publishableKey));

/** True when the server talks to Supabase with the secret key (required after 004_lockdown.sql). */
export const usingSecretKey = Boolean(url && secretKey);

let client: SupabaseClient | null = null;
let warned = false;

/**
 * Supabase client for server code only.
 * • With SUPABASE_SECRET_KEY: full access — RLS is bypassed, so every query here
 *   must filter what the public may see (is_active, is_approved …) itself.
 * • Without it: falls back to the publishable key (works only until 004_lockdown.sql is run).
 */
export function db(): SupabaseClient {
  if (!url || !(secretKey || publishableKey)) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY).");
  }
  if (!secretKey && !warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn("SUPABASE_SECRET_KEY is not set — using the publishable key. Set it, then run supabase/migrations/004_lockdown.sql.");
  }
  client ??= createClient(url, (secretKey || publishableKey)!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Turns a Postgres RAISE message into a safe, customer-facing error. */
export function rpcError(e: { code?: string; message?: string } | null): string {
  if (e?.code === "P0001" && e.message) return e.message; // our own validation messages
  return "Something went wrong. Please try again.";
}
