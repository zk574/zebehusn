export type ProductShape =
  | "perfume"
  | "tube"
  | "jar"
  | "pump"
  | "bar"
  | "kit"
  | "brush"
  | "dropper";

export type Gender = "men" | "women" | "unisex";

export interface Category {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tint: string; // accent colour used by generated visuals
  sort: number;
}

export interface Variant {
  sku: string;
  label: string; // e.g. "50 ml"
  price: number; // PKR
  compareAt?: number; // original price when discounted
  stock: number;
}

export interface Product {
  slug: string;
  name: string;
  categories: string[]; // category slugs (a product can live in several)
  gender: Gender;
  shape: ProductShape;
  tint: string;
  short: string;
  description: string;
  specs: [string, string][];
  ingredients?: string;
  usage: string;
  variants: Variant[];
  images: string[]; // uploaded image URLs (admin) — empty = generated visual
  videoUrl?: string;
  modelUrl?: string; // GLB, optional
  featured?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
  tags: string[];
  rating: number; // average of verified reviews, 0 when none
  reviewCount: number;
  frequentlyBoughtWith?: string[];
}

/** Cart line with a display snapshot. Prices are always re-verified on the server. */
export interface CartLine {
  sku: string;
  slug: string;
  qty: number;
  name: string;
  label: string;
  price: number;
  stock: number;
  shape: ProductShape;
  tint: string;
  image: string | null;
}

/** Server-verified line (from quote_order / priceCart). */
export interface QuoteLine {
  sku: string;
  slug: string;
  name: string;
  variant: string;
  unit: number;
  qty: number;
  total: number;
  stock: number; // capped at 20 — exact stock is never sent to browsers
}

/** Server-verified checkout summary. Shipping is judged on subtotal − discount. */
export interface Quote {
  lines: QuoteLine[];
  problems: string[];
  subtotal: number;
  discount: number;
  coupon: string | null;
  coupon_error: string | null;
  shipping: number;
  total: number;
  payments: { cod: boolean; bank: boolean };
}

export interface Review {
  name: string;
  city: string;
  rating: number;
  body: string;
  date: string;
  productSlug: string;
  productName: string;
}
