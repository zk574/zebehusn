import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackForm } from "./TrackForm";
export const metadata: Metadata = { title: "Track My Order" };
export default function TrackPage() {
  return (
    <div className="container-lux pt-12 md:pt-20">
      <div className="text-center">
        <p className="eyebrow">Order status</p>
        <h1 className="h-display mt-3 mb-10 text-5xl md:text-6xl">Track My Order</h1>
      </div>
      <Suspense fallback={<div className="h-72" />}><TrackForm /></Suspense>
    </div>
  );
}
