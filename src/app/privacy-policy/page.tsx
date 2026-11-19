import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

const sections = [{"h": "Information we collect", "p": "Name, phone number, email, delivery address and order history, plus basic analytics data about how the site is used."}, {"h": "How we use it", "p": "To process and deliver orders, provide support, prevent fraud and \u2014 only with your consent \u2014 send marketing messages."}, {"h": "Payments", "p": "Card and wallet payments are processed by licensed payment providers. We never store full card details."}, {"h": "Sharing", "p": "We share delivery details with courier partners only as needed to deliver your order. We do not sell personal data."}, {"h": "Your rights", "p": "Contact us to access, correct or delete your personal data."}];

export default function Page() {
  return <ContentPage eyebrow="Legal" title="Privacy Policy" intro={"Draft policy \u2014 have this reviewed by a qualified lawyer before launch."} sections={sections} />;
}
