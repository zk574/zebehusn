import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Our Story", alternates: { canonical: "/our-story" } };

const sections = [{"h": "The beginning", "p": "Replace this section with your founding story \u2014 who started the brand, why, and what you saw missing in the market."}, {"h": "The philosophy", "p": "Fewer, better products. Honest ingredients. Packaging worth keeping."}, {"h": "The future", "p": "Expanding our fragrance wardrobe and skincare line, and bringing a Pakistani luxury house to the world."}];

export default function Page() {
  return <ContentPage eyebrow="Heritage" title="Our Story" intro={"Zeb-e-Husn means \u201cthe adornment of beauty.\u201d The name comes from a long South Asian tradition of attar, surma and the daily rituals of self-care."} sections={sections} />;
}
