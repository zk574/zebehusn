import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "About Us", alternates: { canonical: "/about" } };

const sections = [{"h": "What we make", "p": "Perfumes and attars, skincare, haircare, bodycare, oral care and complete grooming kits \u2014 formulated to perform in South Asian climates."}, {"h": "How we make it", "p": "We work with established fragrance and cosmetic laboratories, use dermatologically-informed actives and test every batch before release."}, {"h": "Where we ship", "p": "Nationwide across Pakistan with Cash on Delivery, with international shipping planned."}];

export default function Page() {
  return <ContentPage eyebrow="The House" title="About Us" intro={"Zeb-e-Husn is a Pakistani luxury grooming and fragrance house creating essentials for men and women who notice the details."} sections={sections} />;
}
