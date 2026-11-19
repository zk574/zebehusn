"use client";
import { useState } from "react";

export function Newsletter({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "error"; msg?: string }>({ status: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setState({ status: "ok", msg: data.message }); setEmail(""); }
      else setState({ status: "error", msg: data.error });
    } catch {
      setState({ status: "error", msg: "Network error — please try again." });
    }
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "mx-auto max-w-lg"}>
      {compact && <p className="eyebrow mb-3">The Private List</p>}
      <div className="flex gap-2 rounded-full border border-white/15 p-1.5 focus-within:border-gold/60">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address" aria-label="Email address"
          className="flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-mist/60"
        />
        <button className="btn-gold !px-5 !py-2.5" disabled={state.status === "loading"}>
          {state.status === "loading" ? "…" : "Join"}
        </button>
      </div>
      {state.msg && (
        <p role="status" className={`mt-3 text-xs ${state.status === "ok" ? "text-success" : "text-danger"}`}>{state.msg}</p>
      )}
    </form>
  );
}
