"use client";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import type { Quality } from "./PerfumeScene";

export type Capability = { status: "pending" } | { status: "static" } | { status: "3d"; quality: Quality };

const PENDING: Capability = { status: "pending" };
let cached: Capability | null = null;

/** Detects WebGL support, reduced-motion / data-saver preferences and device class (once per page). */
function detect(): Capability {
  if (cached) return cached;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { webgl = false; }
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (!webgl || reduced || nav.connection?.saveData) return (cached = { status: "static" });
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const mobile = window.matchMedia("(max-width: 767px)").matches || /Android|iPhone|iPad/i.test(nav.userAgent);
  return (cached = { status: "3d", quality: !mobile && cores >= 6 && mem >= 4 ? "high" : "low" });
}

const noop = () => () => {};

/** Decides whether to render WebGL, and at what quality. "pending" during SSR. */
export function use3DCapability(): Capability {
  return useSyncExternalStore(noop, detect, () => PENDING);
}

/** True while the element is within (or near) the viewport. */
export function useInView(ref: RefObject<Element | null>, rootMargin = "200px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
