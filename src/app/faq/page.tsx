import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "FAQ", alternates: { canonical: "/faq" } };

const sections = [{"h": "Do you offer Cash on Delivery?", "p": "Yes \u2014 COD is available nationwide. We confirm each COD order by phone or WhatsApp before dispatch."}, {"h": "How long does delivery take?", "p": "2\u20133 working days in major cities and 3\u20135 working days elsewhere."}, {"h": "How much is shipping?", "p": "Rs 250 flat; free on orders over Rs 5,000."}, {"h": "Are your products authentic?", "p": "Every product is sold directly by us, sealed and batch-coded."}, {"h": "Can I return a product?", "p": "Unopened products can be returned within 7 days of delivery. See Shipping & Returns."}, {"h": "How long do your perfumes last?", "p": "Extraits typically last 10\u201312 hours and eaux de parfum 7\u201310 hours, depending on skin and climate."}];

export default function Page() {
  return <ContentPage eyebrow="Help" title="FAQ" intro={"Answers to the questions we hear most often."} sections={sections} />;
}
