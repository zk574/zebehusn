import { Hero3D } from "@/components/home/Hero3D";
import { AdVideo } from "@/components/home/AdVideo";
import { Showcase3D } from "@/components/home/Showcase3D";
import {
  BrandStory, CategoryGrid, FeaturedCollections, NewsletterBand, ProductRail, ReviewsSection, SocialGallery, WhyUs,
} from "@/components/home/Sections";
import { getCategories, getProducts, getReviews } from "@/lib/catalog";

export default async function Home() {
  const [best, fresh, cats, all, reviews] = await Promise.all([
    getProducts({ flag: "bestseller", limit: 4 }),
    getProducts({ flag: "isNew", limit: 4 }),
    getCategories(),
    getProducts({ flag: "featured" }),
    getReviews(undefined, 3),
  ]);
  return (
    <>
      <Hero3D />
      <AdVideo />
      <FeaturedCollections />
      <Showcase3D />
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
