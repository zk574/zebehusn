import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "My Account", robots: { index: false } };
export default function AccountPage() {
  return (
    <div className="container-lux pt-12 md:pt-20">
      <p className="eyebrow">Members</p>
      <h1 className="h-display mt-3 text-5xl md:text-6xl">My Account</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Link href="/wishlist" className="card-lux p-8 hover:border-gold/40"><p className="font-display text-2xl">Wishlist</p><p className="mt-2 text-sm text-mist">Products you&apos;ve saved.</p></Link>
        <Link href="/track-order" className="card-lux p-8 hover:border-gold/40"><p className="font-display text-2xl">Track an order</p><p className="mt-2 text-sm text-mist">Check delivery status.</p></Link>
        <div className="card-lux p-8"><p className="font-display text-2xl">Sign in</p><p className="mt-2 text-sm text-mist">Customer accounts with order history are enabled once the database is connected.</p></div>
      </div>
    </div>
  );
}
