import { Hero3D } from "@/components/home/Hero3D";
import { AdVideo } from "@/components/home/AdVideo";
import { Showcase3D } from "@/components/home/Showcase3D";
import {
  BrandStory, CategoryGrid, FeaturedCollections, NewsletterBand, ProductRail, ReviewsSection, SocialGallery, WhyUs,
} from "@/components/home/Sections";
import { getCategories, getProducts, getProductsBySlugs, getReviews } from "@/lib/catalog";

const HERO_SLUG = "noir-oud-extrait";
const SHOWCASE_SLUGS = ["noir-oud-extrait", "aurum-eau-de-parfum", "atlas-cedar-cologne"];

export default async function Home() {
  const [best, fresh, cats, all, reviews, showcase] = await Promise.all([
    getProducts({ flag: "bestseller", limit: 4 }),
    getProducts({ flag: "isNew", limit: 4 }),
    getCategories(),
    getProducts({ flag: "featured" }),
    getReviews(undefined, 3),
    getProductsBySlugs(SHOWCASE_SLUGS),
  ]);
  const available = showcase.map((p) => p.slug);
  const heroHref = available.includes(HERO_SLUG) ? `/products/${HERO_SLUG}` : "/collections/perfumes";
  return (
    <>
      <Hero3D productHref={heroHref} />
      <AdVideo />
      <FeaturedCollections />
      <Showcase3D available={available} />
      <ProductRail eyebrow="Best Sellers" title={<>Most <em className="text-gold-gradient">coveted</em></>} products={best} href="/shop?sort=featured" />
      <ProductRail eyebrow="New Arrivals" title={<>Just <em className="text-gold-gradient">arrived</em></>} products={fresh} href="/shop?sort=new" />
      <CategoryGrid categories={cats} />
      <BrandStory />
      <WhyUs />
      <ReviewsSection reviews={reviews} />
      <SocialGallery products={all} />
      <NewsletterBand />
    </>
  );
}
