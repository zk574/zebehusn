import Link from "next/link";
import { ArrowUpRight, Gem, Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Category, Product, Review } from "@/lib/types";
import { site } from "@/config/site";
import { ProductVisual } from "@/components/product/ProductVisual";
import { ProductGrid } from "@/components/product/ProductCard";
import { Newsletter } from "./Newsletter";

export function SectionHead({ eyebrow, title, href, linkLabel = "View all" }: { eyebrow: string; title: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-12 flex items-end justify-between gap-6">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h-display mt-4 text-4xl md:text-6xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-2 text-xs uppercase tracking-[0.2em] text-mist hover:text-gold md:flex">
          {linkLabel} <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function ProductRail({ eyebrow, title, products, href }: { eyebrow: string; title: React.ReactNode; products: Product[]; href?: string }) {
  if (!products.length) return null;
  return (
    <section className="container-lux py-20 md:py-28">
      <SectionHead eyebrow={eyebrow} title={title} href={href} />
      <ProductGrid products={products} />
    </section>
  );
}

export function FeaturedCollections() {
  const items = [
    { title: "The Fragrance Wardrobe", copy: "Extraits, eaux de parfum and attars.", href: "/collections/perfumes", shape: "perfume" as const, tint: "#5a3a1e" },
    { title: "The Skin Ritual", copy: "Cleanse, treat, restore.", href: "/collections/skincare", shape: "dropper" as const, tint: "#e0b860" },
    { title: "The Gentleman", copy: "Beard, shave and styling.", href: "/collections/mens-grooming", shape: "kit" as const, tint: "#1a1a1a" },
  ];
  return (
    <section className="container-lux py-20 md:py-28">
      <SectionHead eyebrow="Featured Collections" title={<>Curated <em className="text-gold-gradient">rituals</em></>} />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((it, i) => (
          <Link key={it.href} href={it.href} className={`group relative overflow-hidden rounded-3xl border border-line ${i === 0 ? "md:row-span-2" : ""}`}>
            <ProductVisual shape={it.shape} tint={it.tint} id={`fc-${i}`} label={it.title} className="h-full min-h-[360px] w-full object-cover transition duration-[1.4s] ease-lux group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
            <div className="absolute bottom-0 p-7">
              <h3 className="font-display text-3xl">{it.title}</h3>
              <p className="mt-1 text-sm text-mist">{it.copy}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">Explore <ArrowUpRight size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  const shapeFor: Record<string, Parameters<typeof ProductVisual>[0]["shape"]> = {
    perfumes: "perfume", skincare: "dropper", haircare: "pump", bodycare: "pump", "mens-grooming": "tube",
    "womens-grooming": "jar", "oral-care": "kit", "soaps-cleansers": "bar", "grooming-kits": "kit", accessories: "brush",
  };
  return (
    <section className="container-lux py-20 md:py-28">
      <SectionHead eyebrow="Shop by Category" title={<>The full <em className="text-gold-gradient">house</em></>} href="/shop" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="group card-lux overflow-hidden">
            <div className="aspect-square overflow-hidden">
              <ProductVisual shape={shapeFor[c.slug] ?? "jar"} tint={c.tint} id={`cat-${c.slug}`} label={c.name} className="h-full w-full transition duration-700 group-hover:scale-110" />
            </div>
            <div className="p-4">
              <p className="font-display text-xl group-hover:text-gold transition">{c.name}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-mist">{c.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BrandStory() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1c160c_0%,#050505_70%)]" />
      <div className="container-lux relative text-center">
        <p className="eyebrow">Our Story</p>
        <h2 className="h-display mx-auto mt-6 max-w-4xl text-5xl md:text-7xl">
          <em className="text-gold-gradient">Zeb-e-Husn</em> — the adornment of beauty.
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-ivory/70 leading-relaxed">
          Born in Pakistan with an international eye, we create grooming and fragrance essentials that honour South Asian
          traditions of attar and adornment — reformulated with modern science, finished with the restraint of a luxury house.
        </p>
        <Link href="/our-story" className="btn-ghost mt-10">Read our story</Link>
      </div>
    </section>
  );
}

export function WhyUs() {
  const items = [
    { icon: Gem, title: "Luxury formulations", copy: "High-concentration perfumes and clinically-informed actives." },
    { icon: ShieldCheck, title: "100% authentic", copy: "Sold only by us — sealed, batch-coded and quality checked." },
    { icon: Truck, title: "Nationwide delivery", copy: `Free over Rs ${site.shipping.freeOver.toLocaleString()} with Cash on Delivery.` },
    { icon: Leaf, title: "Cruelty-free", copy: "Never tested on animals. Paraben-free skincare." },
  ];
  return (
    <section className="container-lux py-20 md:py-28">
      <SectionHead eyebrow="Why Zeb-e-Husn" title={<>The <em className="text-gold-gradient">promise</em></>} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="card-lux p-8">
            <Icon className="text-gold" size={26} strokeWidth={1.3} />
            <h3 className="mt-6 font-display text-2xl">{title}</h3>
            <p className="mt-2 text-sm text-mist leading-relaxed">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Verified reviews only. Renders an honest empty state until real reviews exist (Stage 4). */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section className="container-lux py-20 md:py-28">
      <SectionHead eyebrow="Customer Reviews" title={<>In their <em className="text-gold-gradient">words</em></>} href="/reviews" />
      {reviews.length === 0 ? (
        <div className="card-lux p-10 text-center md:p-16">
          <p className="font-display text-3xl">Verified reviews only.</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-mist">
            Every review on this site comes from a customer with a delivered order. Our first reviews will appear here soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((r, i) => (
            <figure key={i} className="card-lux p-8">
              <p className="text-gold" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-white/15">{"★".repeat(5 - r.rating)}</span></p>
              <blockquote className="mt-4 font-display text-xl leading-snug">“{r.body}”</blockquote>
              <figcaption className="mt-6 text-xs uppercase tracking-[0.2em] text-mist">
                {r.name}{r.city ? ` · ${r.city}` : ""} · <Link href={`/products/${r.productSlug}`} className="text-gold hover:underline">{r.productName}</Link>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

export function SocialGallery({ products }: { products: Product[] }) {
  return (
    <section className="py-20 md:py-28">
      <div className="container-lux">
        <SectionHead eyebrow="@zebehusn" title={<>Follow the <em className="text-gold-gradient">ritual</em></>} href={site.social.instagram} linkLabel="Instagram" />
      </div>
      <div className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {products.slice(0, 6).map((p) => (
          <a key={p.slug} href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden" aria-label="Open Instagram">
            <ProductVisual shape={p.shape} tint={p.tint} id={`ig-${p.slug}`} label={p.name} className="h-full w-full transition duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gold/0 transition group-hover:bg-gold/10" />
          </a>
        ))}
      </div>
    </section>
  );
}

export function NewsletterBand() {
  return (
    <section className="container-lux py-20">
      <div className="card-lux relative overflow-hidden px-6 py-16 text-center md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,164,92,0.15),transparent_60%)]" />
        <div className="relative">
          <p className="eyebrow">The Private List</p>
          <h2 className="h-display mt-4 text-4xl md:text-6xl">First access. <em className="text-gold-gradient">Private offers.</em></h2>
          <p className="mx-auto mt-4 mb-10 max-w-md text-sm text-mist">New launches, limited editions and members-only pricing — never spam.</p>
          <Newsletter />
        </div>
      </div>
    </section>
  );
}
