import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getCategory, getProduct, getProducts, getProductsBySlugs, getRelated, getReviews } from "@/lib/catalog";
import { ReviewForm } from "@/components/product/ReviewForm";
import { site } from "@/config/site";
import { jsonLd } from "@/lib/json-ld";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductMedia } from "@/components/product/ProductMedia";
import { BoughtTogether } from "@/components/product/BoughtTogether";
import { ProductRail } from "@/components/home/Sections";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.short} ${p.description}`.slice(0, 158),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description: p.short, images: p.images.length ? p.images : undefined },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const [category, related, fbt, reviews] = await Promise.all([
    getCategory(product.categories[0]),
    getRelated(product),
    getProductsBySlugs(product.frequentlyBoughtWith ?? []),
    getReviews(product.slug, 20),
  ]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0].sku,
    brand: { "@type": "Brand", name: site.name },
    image: product.images,
    offers: product.variants.map((v) => ({
      "@type": "Offer", sku: v.sku, price: v.price, priceCurrency: "PKR",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site.url}/products/${product.slug}`,
    })),
    ...(product.reviewCount > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } }),
  };

  const details: [string, React.ReactNode][] = [
    ["Description", <p key="d">{product.description}</p>],
    ["Specifications", (
      <dl key="s" className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        {product.specs.map(([k, v]) => <Fragment key={k}><dt className="text-mist">{k}</dt><dd>{v}</dd></Fragment>)}
      </dl>
    )],
    ...(product.ingredients ? [["Ingredients", <p key="i" className="text-sm">{product.ingredients}</p>] as [string, React.ReactNode]] : []),
    ["How to use", <p key="u">{product.usage}</p>],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <div className="container-lux pt-8 md:pt-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-mist">
          <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-2">/</span>
          {category && <><Link href={`/collections/${category.slug}`} className="hover:text-gold">{category.name}</Link> <span className="mx-2">/</span></>}
          <span className="text-ivory">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductMedia product={product} />
          <div>
            <p className="eyebrow">{category?.name}</p>
            <h1 className="h-display mt-3 text-5xl md:text-6xl">{product.name}</h1>
            <p className="mt-4 text-lg text-ivory/75">{product.short}</p>
            <p className="mt-3 text-xs text-mist">
              {product.reviewCount > 0 ? `★ ${product.rating.toFixed(1)} · ${product.reviewCount} verified reviews` : "No reviews yet"}
            </p>
            <div className="hairline my-8" />
            <BuyBox product={product} />

            <div className="mt-10 divide-y divide-line border-y border-line">
              {details.map(([title, body], i) => (
                <details key={title} open={i === 0} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl">
                    {title}<span className="text-gold transition group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-4 text-sm leading-relaxed text-ivory/75">{body}</div>
                </details>
              ))}
            </div>
          </div>
        </div>

        <BoughtTogether main={product} others={fbt} />

        <section className="mt-16" aria-labelledby="reviews">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="reviews" className="font-display text-3xl">Customer Reviews</h2>
              <p className="mt-1 text-sm text-mist">
                {product.reviewCount > 0 ? `★ ${product.rating.toFixed(1)} average · ${product.reviewCount} verified ${product.reviewCount === 1 ? "review" : "reviews"}` : "Verified-purchase reviews only."}
              </p>
            </div>
          </div>
          {reviews.length > 0 ? (
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {reviews.map((r, i) => (
                <li key={i} className="card-lux p-6">
                  <p className="text-gold" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-white/15">{"★".repeat(5 - r.rating)}</span></p>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/85">{r.body}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.15em] text-mist">{r.name}{r.city ? ` · ${r.city}` : ""} · Verified buyer</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-lux mt-6 p-8 text-center text-sm text-mist">No reviews yet. Bought this? Share your experience once your order is delivered.</div>
          )}
          <div className="mt-6"><ReviewForm productSlug={product.slug} /></div>
        </section>
      </div>
      <ProductRail eyebrow="You may also like" title="Related" products={related} />
    </>
  );
}

