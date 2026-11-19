import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Contact Us", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const items = [
    { icon: MessageCircle, label: "WhatsApp", value: site.contact.phone, href: `https://wa.me/${site.contact.whatsapp}` },
    { icon: Phone, label: "Phone", value: site.contact.phone, href: `tel:${site.contact.phoneIntl}` },
    ...(site.contact.email ? [{ icon: Mail, label: "Email", value: site.contact.email, href: `mailto:${site.contact.email}` }] : []),
    { icon: MapPin, label: "Studio", value: site.contact.address },
  ];
  return (
    <div className="container-lux pt-12 md:pt-20">
      <p className="eyebrow">Client care</p>
      <h1 className="h-display mt-3 text-5xl md:text-7xl">Contact Us</h1>
      <p className="mt-6 max-w-xl text-ivory/75">Our team replies Monday to Saturday, 10am – 7pm PKT. WhatsApp is the fastest way to reach us.</p>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, label, value, href }) => {
          const inner = (<><Icon className="text-gold" size={24} strokeWidth={1.3} /><p className="eyebrow mt-6">{label}</p><p className="mt-2 font-display text-xl">{value}</p></>);
          return href
            ? <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="card-lux p-8 transition hover:border-gold/40">{inner}</a>
            : <div key={label} className="card-lux p-8">{inner}</div>;
        })}
      </div>
    </div>
  );
}
