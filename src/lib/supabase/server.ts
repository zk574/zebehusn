import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when Supabase env vars are set. Without them the site runs on the sample catalogue (dev only). */
export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * Anonymous (publishable-key) client for server code.
 * Row Level Security decides what it may read; writes go only through
 * the public RPCs (place_order, track_order, submit_review, subscribe_newsletter).
 */
export function db(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Turns a Postgres RAISE message into a safe, customer-facing error. */
export function rpcError(e: { code?: string; message?: string } | null): string {
  if (e?.code === "P0001" && e.message) return e.message; // our own validation messages
  return "Something went wrong. Please try again.";
}
