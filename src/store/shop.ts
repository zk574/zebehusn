"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, QuoteLine } from "@/lib/types";

const MAX_QTY = 20;

interface ShopState {
  cart: CartLine[];
  wishlist: string[]; // product slugs
  cartOpen: boolean;
  add: (line: CartLine) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  /** Refresh the saved price/stock snapshot from a server-verified quote. */
  syncFromQuote: (lines: QuoteLine[]) => void;
  toggleWish: (slug: string) => void;
  setCartOpen: (open: boolean) => void;
}

export const useShop = create<ShopState>()(
  persist(
    (set) => ({
      cart: [],
      wishlist: [],
      cartOpen: false,
      add: (line) =>
        set((s) => {
          if (line.stock <= 0) return s; // sold out — never add
          const existing = s.cart.find((l) => l.sku === line.sku);
          const cart = existing
            ? s.cart.map((l) => (l.sku === line.sku ? { ...line, qty: Math.min(l.qty + line.qty, MAX_QTY, line.stock) } : l))
            : [...s.cart, { ...line, qty: Math.max(1, Math.min(line.qty, MAX_QTY, line.stock)) }];
          return { cart, cartOpen: true };
        }),
      setQty: (sku, qty) =>
        set((s) => ({ cart: s.cart.map((l) => (l.sku === sku ? { ...l, qty: Math.max(1, Math.min(qty, MAX_QTY, Math.max(l.stock, 1))) } : l)) })),
      remove: (sku) => set((s) => ({ cart: s.cart.filter((l) => l.sku !== sku) })),
      clear: () => set({ cart: [] }),
      syncFromQuote: (lines) =>
        set((s) => {
          let changed = false;
          const cart = s.cart.map((l) => {
            const q = lines.find((x) => x.sku === l.sku);
            if (!q || (q.unit === l.price && q.stock === l.stock && q.name === l.name && q.variant === l.label)) return l;
            changed = true;
            return { ...l, price: q.unit, stock: q.stock, name: q.name, label: q.variant };
          });
          return changed ? { cart } : s;
        }),
      toggleWish: (slug) =>
        set((s) => ({
          wishlist: s.wishlist.includes(slug) ? s.wishlist.filter((x) => x !== slug) : [...s.wishlist, slug],
        })),
      setCartOpen: (cartOpen) => set({ cartOpen }),
    }),
    {
      name: "zeh-shop",
      version: 2,
      partialize: (s) => ({ cart: s.cart, wishlist: s.wishlist }),
      // v1 carts had no price snapshot — drop them rather than show wrong data.
      migrate: (state, version) => {
        const s = state as { cart?: CartLine[]; wishlist?: string[] };
        return { cart: version < 2 ? [] : (s.cart ?? []), wishlist: s.wishlist ?? [] } as unknown as ShopState;
      },
    },
  ),
);
