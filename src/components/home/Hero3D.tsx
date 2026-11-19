"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { use3DCapability, useInView } from "@/components/three/use3d";
import { ProductVisual } from "@/components/product/ProductVisual";

const PerfumeScene = dynamic(() => import("@/components/three/PerfumeScene"), { ssr: false });

const STEPS = [
  { at: 0.0, eyebrow: "Noir Oud Extrait", title: <>Every part,<br /><em className="text-gold-gradient">considered.</em></>, body: "Eight components. Hand-finished glass, gold-plated collar, precision atomiser." },
  { at: 0.3, eyebrow: "The Assembly", title: <>Engineered<br />like <em className="text-gold-gradient">jewellery.</em></>, body: "A weighted glass body holds 25% oil concentration — sealed by a crimpless gold collar." },
  { at: 0.62, eyebrow: "The Atomiser", title: <>A mist as fine<br />as <em className="text-gold-gradient">silk.</em></>, body: "Our pump delivers an even 0.1 ml veil for a trail that stays close for hours." },
  { at: 0.88, eyebrow: "The Signature", title: <>Smoked oud.<br /><em className="text-gold-gradient">Black amber.</em></>, body: "Drag to turn the bottle. Then make it yours." },
];

/** `productHref` comes from the server so the button never points at a product that no longer exists. */
export function Hero3D({ productHref }: { productHref: string }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [step, setStep] = useState(0);
  const cap = use3DCapability();
  const inView = useInView(section, "0px");
  const is3d = cap.status === "3d";
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!is3d || !section.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        progress.current = self.progress;
        let s = 0;
        STEPS.forEach((x, i) => { if (self.progress >= x.at) s = i; });
        setStep((prev) => (prev === s ? prev : s));
      },
    });
    return () => st.kill();
  }, [is3d]);

  return (
    <section
      ref={section}
      aria-label="Noir Oud Extrait — interactive product assembly"
      className={is3d ? "relative h-[380vh] md:h-[420vh] -mt-16 md:-mt-20" : "relative -mt-16 md:-mt-20"}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden grain">
        {/* 3D canvas or static fallback */}
        <div className="absolute inset-0">
          {is3d ? (
            <PerfumeScene mode="assembly" progress={progress} quality={cap.quality} active={inView} offsetX={wide ? 1.35 : 0} offsetY={wide ? -0.35 : 0.85} scale={wide ? 0.82 : 0.6} />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(ellipse_at_center,#221c12_0%,#050505_65%)]">
              {cap.status === "static" && (
                <ProductVisual shape="perfume" tint="#2a1a0e" id="hero-fallback" label="Noir Oud Extrait bottle" className="h-[60vh] w-auto opacity-90" />
              )}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent md:from-ink/70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

        {/* Copy */}
        <div className="container-lux relative z-10 flex h-full items-end pb-24 md:items-center md:pb-0">
          <div className="max-w-xl">
            <h1 className="sr-only">Zeb-e-Husn — luxury fragrance and grooming, made in Pakistan</h1>
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`transition-all duration-700 ease-lux ${i === step ? "opacity-100 translate-y-0" : "pointer-events-none absolute opacity-0 translate-y-6"}`}
                aria-hidden={i !== step}
              >
                <p className="eyebrow">{s.eyebrow}</p>
                <p className="h-display mt-5 text-[13vw] sm:text-7xl lg:text-8xl">{s.title}</p>
                <p className="mt-6 max-w-md text-sm leading-relaxed text-ivory/70 md:text-base">{s.body}</p>
              </div>
            ))}
            <div className="pointer-events-auto mt-10 flex flex-wrap gap-3">
              <Link href={productHref} className="btn-gold">Discover Noir Oud</Link>
              <Link href="/shop" className="btn-ghost">Shop the House</Link>
            </div>
          </div>
        </div>

        {/* Progress rail */}
        {is3d && (
          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 md:flex" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-8 w-px transition-colors ${i <= step ? "bg-gold" : "bg-white/15"}`} />
            ))}
          </div>
        )}
        {is3d && step === 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-mist animate-pulse">Scroll to assemble</div>
        )}
      </div>
    </section>
  );
}
