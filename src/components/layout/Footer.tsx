import Link from "next/link";
import { site } from "@/config/site";
import { getCategories } from "@/lib/catalog";
import { Logo } from "./Header";
import { Newsletter } from "@/components/home/Newsletter";
import { Year } from "./Year";

const help = [
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Track My Order", href: "/track-order" },
  { label: "Shipping & Returns", href: "/shipping-returns" },
];
const house = [
  { label: "About Us", href: "/about" },
  { label: "Our Story", href: "/our-story" },
  { label: "Grooming Journal", href: "/journal" },
  { label: "Customer Reviews", href: "/reviews" },
];
const legal = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export async function Footer() {
  const categories = await getCategories();
  const socials = [
    { label: "Instagram", href: site.social.instagram },
    { label: "Facebook", href: site.social.facebook },
    { label: "TikTok", href: site.social.tiktok },
  ].filter((s) => s.href);
  return (
    <footer className="relative mt-24 border-t border-line bg-onyx">
      <div className="container-lux grid gap-14 py-20 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-mist">{site.description}</p>
          <div className="mt-8 max-w-sm"><Newsletter compact /></div>
        </div>
        <FooterCol title="Shop" links={categories.slice(0, 7).map((c) => ({ label: c.name, href: `/collections/${c.slug}` }))} />
        <FooterCol title="Help" links={help} />
        <FooterCol title="The House" links={[...house, ...legal]} />
      </div>
      <div className="hairline" />
      <div className="container-lux flex flex-col gap-4 py-8 text-xs text-mist md:flex-row md:items-center md:justify-between">
        <p>© <Year /> {site.name}. All rights reserved.</p>
        <div className="flex flex-wrap gap-6">
          <a href={`https://wa.me/${site.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold">WhatsApp {site.contact.phone}</a>
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{s.label}</a>
          ))}
        </div>
        <p>Cash on Delivery · Bank Transfer · Cards (soon)</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="eyebrow mb-6">{title}</h3>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="text-sm text-ivory/75 hover:text-gold transition">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
