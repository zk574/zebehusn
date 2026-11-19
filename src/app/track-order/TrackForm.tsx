"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { formatPKR } from "@/lib/format";
import { site } from "@/config/site";

type Tracked = {
  order_number: string; status: string; payment_status: string; total: number; city: string;
  courier: string | null; tracking_number: string | null; created_at: string;
  items: { name: string; variant: string; qty: number }[];
  events: { status: string; note: string | null; at: string }[];
};

const STEPS = ["pending", "confirmed", "processing", "dispatched", "delivered"];
const LABEL: Record<string, string> = {
  pending: "Order placed", confirmed: "Confirmed", processing: "Being prepared", dispatched: "Dispatched",
  delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
};

export function TrackForm() {
  const params = useSearchParams();
  const [order, setOrder] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Tracked | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setData(null);
    try {
      const res = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order, phone }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find your order.");
    } finally { setBusy(false); }
  }

  const reached = data ? STEPS.indexOf(data.status) : -1;

  return (
    <div className="mx-auto max-w-2xl text-left">
      <form onSubmit={submit} className="card-lux space-y-4 p-8">
        <input className="input-lux uppercase" placeholder="Order number (e.g. ZEH-261119-AB12CD)" required value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Order number" />
        <input className="input-lux" placeholder="Phone number used at checkout" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number" />
        <button className="btn-gold w-full" disabled={busy}>{busy ? "Searching…" : "Track order"}</button>
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}{" "}
            <a className="underline" href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Please share the status of order ${order}.`)}`} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>
          </p>
        )}
      </form>

      {data && (
        <section className="card-lux mt-6 p-8" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-3xl">{data.order_number}</h2>
            <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em]", data.status === "cancelled" ? "bg-danger/20 text-danger" : "bg-gold/15 text-gold")}>{LABEL[data.status] ?? data.status}</span>
          </div>
          <p className="mt-1 text-sm text-mist">{formatPKR(data.total)} · {data.city} · placed {new Date(data.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}</p>

          {data.status !== "cancelled" && data.status !== "refunded" && (
            <ol className="mt-8 grid grid-cols-5 gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className="text-center">
                  <span className={clsx("mx-auto block h-1.5 rounded-full", i <= reached ? "bg-gold" : "bg-white/10")} />
                  <span className={clsx("mt-2 block text-[10px] uppercase tracking-[0.1em]", i <= reached ? "text-ivory" : "text-mist")}>{LABEL[s]}</span>
                </li>
              ))}
            </ol>
          )}

          {data.tracking_number && (
            <p className="mt-6 text-sm">Courier: <span className="text-gold">{data.courier}</span> · Tracking no: <span className="font-mono text-gold">{data.tracking_number}</span></p>
          )}

          <ul className="mt-6 space-y-1 border-t border-line pt-4 text-sm">
            {data.items.map((it, i) => <li key={i}>{it.qty} × {it.name} <span className="text-mist">({it.variant})</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
