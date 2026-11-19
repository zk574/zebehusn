"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";
import { Box } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";
import { use3DCapability } from "@/components/three/use3d";

const PerfumeScene = dynamic(() => import("@/components/three/PerfumeScene"), { ssr: false });

type Slide = { kind: "image"; src: string } | { kind: "visual" } | { kind: "video"; src: string } | { kind: "3d" };

export function ProductMedia({ product }: { product: Product }) {
  const cap = use3DCapability();
  const has3d = !!product.modelUrl || product.shape === "perfume";
  const slides: Slide[] = [
    ...(product.images.length ? product.images.map((src) => ({ kind: "image" as const, src })) : [{ kind: "visual" as const }]),
    ...(product.videoUrl ? [{ kind: "video" as const, src: product.videoUrl }] : []),
    ...(has3d && cap.status === "3d" ? [{ kind: "3d" as const }] : []),
  ];
  const [i, setI] = useState(0);
  const s = slides[Math.min(i, slides.length - 1)];

  return (
    <div className="lg:sticky lg:top-28">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-ink">
        {s.kind === "image" && <Image src={s.src} alt={product.name} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />}
        {s.kind === "visual" && <ProductVisual shape={product.shape} tint={product.tint} id={`pdp-${product.slug}`} label={product.name} className="h-full w-full" />}
        {s.kind === "video" && <video src={s.src} controls playsInline preload="metadata" className="h-full w-full object-cover" />}
        {s.kind === "3d" && cap.status === "3d" && (
          <>
            <PerfumeScene mode="showcase" quality={cap.quality} liquid={product.tint} modelUrl={product.modelUrl} scale={0.8} offsetY={-0.3} />
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-mist">Drag to rotate</p>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="mt-4 flex gap-3">
          {slides.map((x, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={x.kind === "3d" ? "View in 3D" : `View media ${idx + 1}`}
              className={clsx("relative h-20 w-16 overflow-hidden rounded-xl border transition", idx === i ? "border-gold" : "border-line opacity-60 hover:opacity-100")}>
              {x.kind === "3d" ? <span className="grid h-full place-items-center bg-graphite text-gold"><Box size={20} /><span className="sr-only">3D</span></span>
                : x.kind === "image" ? <Image src={x.src} alt="" fill sizes="64px" className="object-cover" />
                : <ProductVisual shape={product.shape} tint={product.tint} id={`th-${idx}`} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
