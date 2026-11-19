import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container-lux py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-4 text-6xl">This page has evaporated.</h1>
      <Link href="/shop" className="btn-gold mt-10">Return to the shop</Link>
    </div>
  );
}
