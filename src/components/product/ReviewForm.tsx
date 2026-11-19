"use client";
import { useState } from "react";
import clsx from "clsx";

/** Verified-purchase review: the database checks the order was delivered and contains this product. */
export function ReviewForm({ productSlug }: { productSlug: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [f, setF] = useState({ order: "", phone: "", name: "", city: "", body: "" });
  const [state, setState] = useState<{ s: "idle" | "busy" | "ok" | "err"; msg?: string }>({ s: "idle" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ s: "busy" });
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, rating, product: productSlug }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) setState({ s: "ok", msg: data.message });
    else setState({ s: "err", msg: data?.error ?? "Could not submit your review." });
  }

  if (state.s === "ok") return <p role="status" className="card-lux p-6 text-center text-sm text-success">{state.msg}</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn-ghost">Write a review</button>;

  return (
    <form onSubmit={submit} className="card-lux grid gap-4 p-6 sm:grid-cols-2">
      <p className="text-xs text-mist sm:col-span-2">Only customers with a delivered order can review. Enter the order number and phone used at checkout.</p>
      <input className="input-lux uppercase" placeholder="Order number *" required value={f.order} onChange={set("order")} />
      <input className="input-lux" placeholder="Phone number *" required inputMode="tel" value={f.phone} onChange={set("phone")} />
      <input className="input-lux" placeholder="Your name *" required value={f.name} onChange={set("name")} />
      <input className="input-lux" placeholder="City" value={f.city} onChange={set("city")} />
      <fieldset className="sm:col-span-2">
        <legend className="eyebrow mb-2">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n}
              className={clsx("text-3xl transition", n <= rating ? "text-gold" : "text-white/15 hover:text-white/40")}>★</button>
          ))}
        </div>
      </fieldset>
      <textarea className="input-lux min-h-28 sm:col-span-2" placeholder="Your review *" required minLength={10} maxLength={1500} value={f.body} onChange={set("body")} />
      {state.s === "err" && <p role="alert" className="text-sm text-danger sm:col-span-2">{state.msg}</p>}
      <button className="btn-gold sm:col-span-2" disabled={state.s === "busy"}>{state.s === "busy" ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
