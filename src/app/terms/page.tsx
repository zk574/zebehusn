import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

const sections = [{"h": "Orders", "p": "An order is confirmed once we have verified it (and, for bank transfers, received payment). We may cancel orders affected by pricing errors or stock issues."}, {"h": "Pricing", "p": "All prices are in Pakistani Rupees and include applicable taxes. Prices may change without notice; the price at confirmation applies."}, {"h": "Product use", "p": "Patch-test skincare and fragrance before full use. Discontinue use if irritation occurs."}, {"h": "Governing law", "p": "These terms are governed by the laws of Pakistan."}];

export default function Page() {
  return <ContentPage eyebrow="Legal" title="Terms & Conditions" intro={"Draft terms \u2014 have these reviewed by a qualified lawyer before launch."} sections={sections} />;
}
