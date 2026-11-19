import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-lux pt-12 md:pt-16">
      <p className="eyebrow">Secure checkout</p>
      <h1 className="h-display mt-3 mb-10 text-5xl md:text-6xl">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
