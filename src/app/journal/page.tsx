import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/lib/journal";
export const metadata: Metadata = { title: "Grooming Journal", description: "Fragrance, skincare and grooming guides.", alternates: { canonical: "/journal" } };
export default function JournalPage() {
  return (
    <div className="container-lux pt-12 md:pt-20">
      <p className="eyebrow">The Journal</p>
      <h1 className="h-display mt-3 text-5xl md:text-7xl">Grooming Journal</h1>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.slug} href={`/journal/${p.slug}`} className="card-lux group p-8 transition hover:border-gold/40">
            <p className="eyebrow">{p.category}</p>
            <h2 className="mt-4 font-display text-3xl leading-tight group-hover:text-gold">{p.title}</h2>
            <p className="mt-3 text-sm text-mist">{p.excerpt}</p>
            <p className="mt-6 text-xs text-mist">{new Date(p.date).toLocaleDateString("en-PK", { dateStyle: "long" })}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
