import type { Metadata } from "next";
import { ReviewsSection } from "@/components/home/Sections";
import { getReviews } from "@/lib/catalog";
export const metadata: Metadata = { title: "Customer Reviews", alternates: { canonical: "/reviews" } };
export default async function ReviewsPage() {
  return <div className="pt-4"><ReviewsSection reviews={await getReviews(undefined, 60)} /></div>;
}
