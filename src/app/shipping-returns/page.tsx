import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Shipping & Returns", alternates: { canonical: "/shipping-returns" } };

const sections = [{"h": "Shipping", "p": "Orders are dispatched within 24 hours on working days. Rs 250 flat rate; free over Rs 5,000. Tracking numbers are shared once your parcel is with the courier."}, {"h": "Cash on Delivery", "p": "Please keep the exact amount ready. Orders refused at the door without a valid reason may affect future COD eligibility."}, {"h": "Returns", "p": "Unopened, unused products in original packaging can be returned within 7 days of delivery. For hygiene reasons opened fragrances, skincare and oral care cannot be returned unless faulty."}, {"h": "Damaged or wrong items", "p": "Contact us within 48 hours with photos and we will replace the item at no cost."}, {"h": "Refunds", "p": "Approved refunds are issued by bank transfer within 5\u20137 working days."}];

export default function Page() {
  return <ContentPage eyebrow="Policies" title="Shipping & Returns" intro={undefined} sections={sections} />;
}
