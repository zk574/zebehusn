import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, parseSort } from "@/components/product/CatalogView";
import { getCategories, getCategory, getProducts } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string }> };

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  return { title: c.name, description: c.description, alternates: { canonical: `/collections/${c.slug}` } };
}

async function Inner({ params, searchParams }: Params) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const sort = parseSort((await searchParams).sort);
  const [products, categories] = await Promise.all([getProducts({ category: slug, sort }), getCategories()]);
  return (
    <CatalogView eyebrow={category.tagline} title={category.name} description={category.description}
      products={products} categories={categories} activeCategory={slug} sort={sort} basePath={`/collections/${slug}`} />
  );
}

export default function CollectionPage(props: Parameters<typeof Inner>[0]) {
  return (
    <Suspense fallback={<div className="container-lux min-h-[70vh] pt-20"><div className="h-16 w-64 animate-pulse rounded bg-white/5" /></div>}>
      <Inner {...props} />
    </Suspense>
  );
}
