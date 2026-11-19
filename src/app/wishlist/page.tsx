import type { Metadata } from "next";
import { WishlistView } from "./WishlistView";
export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };
export default function WishlistPage() {
  return (
    <div className="container-lux pt-12 md:pt-16">
      <p className="eyebrow">Saved for later</p>
      <h1 className="h-display mt-3 mb-10 text-5xl md:text-6xl">Wishlist</h1>
      <WishlistView />
    </div>
  );
}
