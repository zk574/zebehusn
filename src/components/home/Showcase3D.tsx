"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { use3DCapability, useInView } from "@/components/three/use3d";
import { ProductVisual } from "@/components/product/ProductVisual";

const PerfumeScene = dynamic(() => import("@/components/three/PerfumeScene"), { ssr: false });

const EDITIONS = [
  { name: "Noir Oud", liquid: "#8a4a14", slug: "noir-oud-extrait", note: "Oud · Saffron · Black amber" },
  { name: "Aurum", liquid: "#e0a838", slug: "aurum-eau-de-parfum", note: "Jasmine · Mandarin · Vanilla" },
  { name: "Atlas Cedar", liquid: "#6f8a5a", slug: "atlas-cedar-cologne", note: "Cedar · Vetiver · Grapefruit" },
];

/** Interactive, drag-to-rotate product viewer. Canvas mounts only when scrolled near. */
export function Showcase3D() {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, "300px");
  const cap = use3DCapability();
  const [i, setI] = useState(0);
  const ed = EDITIONS[i];

  return (
    <section className="container-lux py-24 md:py-32">
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div ref={ref} className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-ink md:aspect-[4/3]">
          {cap.status === "3d" && near ? (
            <PerfumeScene mode="showcase" quality={cap.quality} liquid={ed.liquid} active={near} scale={0.78} offsetY={-0.3} />
          ) : (
            <div className="grid h-full place-items-center">
              {cap.status === "static" && <ProductVisual shape="perfume" tint={ed.liquid} id={`sc-${i}`} label={ed.name} className="h-4/5" />}
            </div>
          )}
          {cap.status === "3d" && (
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-mist">Drag to rotate</p>
          )}
        </div>
        <div>
          <p className="eyebrow">Interactive Showcase</p>
          <h2 className="h-display mt-4 text-5xl md:text-6xl">Turn it.<br /><em className="text-gold-gradient">Study it.</em></h2>
          <p className="mt-6 max-w-md text-ivory/70">Every bottle is rendered in real time. Choose an edition and examine the cut of the glass, the weight of the gold, the colour of the juice.</p>
          <div className="mt-8 flex flex-wrap gap-3" role="radiogroup" aria-label="Choose edition">
            {EDITIONS.map((e, idx) => (
              <button
                key={e.slug} role="radio" aria-checked={i === idx} onClick={() => setI(idx)}
                className={`flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm transition ${i === idx ? "border-gold text-gold" : "border-white/15 hover:border-white/40"}`}
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: e.liquid }} />
                {e.name}
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm text-mist">{ed.note}</p>
          <Link href={`/products/${ed.slug}`} className="btn-gold mt-8">Shop {ed.name}</Link>
        </div>
      </div>
    </section>
  );
}
