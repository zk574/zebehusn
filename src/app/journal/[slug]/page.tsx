import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { posts } from "@/lib/journal";
import { site } from "@/config/site";
import { jsonLd } from "@/lib/json-ld";

type Params = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return posts.map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = posts.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt, alternates: { canonical: `/journal/${p.slug}` }, openGraph: { type: "article", title: p.title } } : {};
}
export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const p = posts.find((x) => x.slug === slug);
  if (!p) notFound();
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.date, publisher: { "@type": "Organization", name: site.name } };
  return (
    <article className="container-lux max-w-3xl pt-12 md:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <p className="eyebrow">{p.category}</p>
      <h1 className="h-display mt-3 text-5xl md:text-6xl">{p.title}</h1>
      <p className="mt-4 text-xs text-mist">{new Date(p.date).toLocaleDateString("en-PK", { dateStyle: "long" })}</p>
      <div className="hairline my-10" />
      <div className="space-y-6 text-lg leading-relaxed text-ivory/80">{p.body.map((b, i) => <p key={i}>{b}</p>)}</div>
    </article>
  );
}
