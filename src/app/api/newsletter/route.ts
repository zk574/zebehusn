import { NextResponse } from "next/server";
import { z } from "zod";
import { db, supabaseConfigured } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.email().max(200) });

/** Stores subscribers in Supabase; optionally also forwards to NEWSLETTER_WEBHOOK_URL (Mailchimp/Klaviyo/Zapier). */
export async function POST(req: Request) {
  if (!(await rateLimit(req, "newsletter", 5))) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const hook = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!supabaseConfigured && !hook) return NextResponse.json({ error: "Newsletter signups are not configured yet." }, { status: 503 });

  if (supabaseConfigured) {
    const { error } = await db().rpc("subscribe_newsletter", { p_email: email, p_source: "website" });
    if (error) return NextResponse.json({ error: "Could not subscribe right now. Please try again." }, { status: 500 });
  }
  if (hook) {
    await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: "website" }) }).catch(() => null);
  }
  return NextResponse.json({ message: "Welcome to the private list." });
}
