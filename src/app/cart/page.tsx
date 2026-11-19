import type { Metadata } from "next";
import { CartView } from "./CartView";
export const metadata: Metadata = { title: "Shopping Bag", robots: { index: false } };
export default function CartPage() {
  return (
    <div className="container-lux pt-12 md:pt-16">
      <h1 className="h-display mb-10 text-5xl md:text-6xl">Your Bag</h1>
      <CartView />
    </div>
  );
}
