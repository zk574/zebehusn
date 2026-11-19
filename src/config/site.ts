/**
 * Central brand configuration.
 * Change the brand name, contact details and social links here.
 * In Stage 5 these values move into the admin dashboard (site_settings table).
 */
export const site = {
  name: "Zeb-e-Husn",
  shortName: "ZEB·E·HUSN",
  tagline: "The Art of Refined Grooming",
  description:
    "Luxury unisex fragrances, skincare, haircare and grooming essentials — crafted for those who notice the details.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "PKR",
  locale: "en-PK",
  contact: {
    email: "", // TODO: add your support email — it stays hidden on the site while empty
    phone: "0327 3726022",
    phoneIntl: "+923273726022", // used for tel: links and SEO data
    whatsapp: "923273726022", // international format, digits only
    address: "Lahore, Pakistan",
  },
  /** Full profile URLs, e.g. "https://instagram.com/zebehusn". Empty = hidden on the site. */
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  shipping: {
    flatRate: 250,
    freeOver: 5000,
  },
  /** Advertisement film — set src to a hosted MP4/WebM. Admin-managed from Stage 5. */
  adVideo: {
    src: process.env.NEXT_PUBLIC_AD_VIDEO_URL ?? "",
    poster: "",
    headline: "A ritual, distilled.",
  },
} as const;

export const nav = [
  { label: "Shop All", href: "/shop" },
  { label: "Perfumes", href: "/collections/perfumes" },
  { label: "Skincare", href: "/collections/skincare" },
  { label: "Haircare", href: "/collections/haircare" },
  { label: "Men", href: "/collections/mens-grooming" },
  { label: "Women", href: "/collections/womens-grooming" },
  { label: "Our Story", href: "/our-story" },
] as const;
