"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import clsx from "clsx";
import { nav, site } from "@/config/site";
import { useShop } from "@/store/shop";
import { useCartLines, useHydrated } from "@/lib/use-cart-lines";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const hydrated = useHydrated();
  const { count } = useCartLines();
  const wishCount = useShop((s) => s.wishlist.length);
  const setCartOpen = useShop((s) => s.setCartOpen);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearch(false);
    setMenu(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <div className="relative z-50 bg-gold text-ink text-center text-[11px] font-semibold tracking-[0.2em] uppercase py-2">
        <span className="hidden sm:inline">Free delivery across Pakistan on orders over Rs {site.shipping.freeOver.toLocaleString()} · Cash on Delivery available</span><span className="sm:hidden">Free delivery over Rs {site.shipping.freeOver.toLocaleString()} · COD</span>
      </div>
      <header
        className={clsx(
          "sticky top-0 z-40 transition-all duration-500",
          scrolled ? "bg-ink/80 backdrop-blur-xl border-b border-line" : "bg-transparent",
        )}
      >
        <div className="container-lux flex h-16 md:h-20 items-center justify-between gap-6">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setMenu(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>

          <Link href="/" className="flex items-center gap-3" aria-label={`${site.name} home`}>
            <Logo />
          </Link>

          <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-[12px] font-medium uppercase tracking-[0.2em] text-ivory/80 hover:text-gold transition">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => setSearch((s) => !s)} className="p-2 hover:text-gold transition" aria-label="Search">
              <Search size={19} />
            </button>
            <Link href="/wishlist" className="relative p-2 hover:text-gold transition hidden sm:block" aria-label="Wishlist">
              <Heart size={19} />
              {hydrated && wishCount > 0 && <Badge n={wishCount} />}
            </Link>
            <Link href="/account" className="p-2 hover:text-gold transition hidden sm:block" aria-label="Account">
              <User size={19} />
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative p-2 hover:text-gold transition" aria-label="Open cart">
              <ShoppingBag size={19} />
              {hydrated && count > 0 && <Badge n={count} />}
            </button>
          </div>
        </div>

        {search && (
          <form onSubmit={submit} className="container-lux pb-5">
            <div className="flex items-center gap-3 border-b border-gold/40 py-3">
              <Search size={18} className="text-gold" />
              <input
                autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search fragrances, skincare, kits…"
                className="w-full bg-transparent font-display text-2xl outline-none placeholder:text-mist/50"
                aria-label="Search products"
              />
              <button type="submit" className="eyebrow">Search</button>
            </div>
          </form>
        )}
      </header>

      {/* Mobile menu */}
      <div className={clsx("fixed inset-0 z-[60] lg:hidden transition", menu ? "visible" : "invisible")}>
        <div className={clsx("absolute inset-0 bg-black/70 transition-opacity", menu ? "opacity-100" : "opacity-0")} onClick={() => setMenu(false)} />
        <aside className={clsx("absolute left-0 top-0 h-full w-[86%] max-w-sm bg-onyx border-r border-line p-6 transition-transform duration-500 ease-lux flex flex-col", menu ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between mb-10">
            <Logo />
            <button onClick={() => setMenu(false)} aria-label="Close menu"><X /></button>
          </div>
          <form onSubmit={submit} className="mb-8">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input-lux" aria-label="Search products" />
          </form>
          <nav className="flex flex-col gap-5">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="font-display text-3xl font-light hover:text-gold">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex gap-6 pt-8 text-sm text-mist">
            <Link href="/wishlist" onClick={() => setMenu(false)}>Wishlist</Link>
            <Link href="/account" onClick={() => setMenu(false)}>Account</Link>
            <Link href="/track-order" onClick={() => setMenu(false)}>Track order</Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
      {n}
    </span>
  );
}

/** Replace with the provided logo file: drop it in /public/logo.svg and swap this component. */
export function Logo() {
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="font-display text-xl md:text-2xl tracking-[0.35em] text-gold-gradient font-medium">{site.shortName}</span>
      <span className="mt-1 text-[8px] tracking-[0.5em] text-mist uppercase">Est. Pakistan</span>
    </span>
  );
}
