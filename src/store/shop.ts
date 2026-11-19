"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

interface ShopState {
  cart: CartLine[];
  wishlist: string[]; // product slugs
  cartOpen: boolean;
  add: (line: CartLine) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
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
          const existing = s.cart.find((l) => l.sku === line.sku);
          const cart = existing
            ? s.cart.map((l) => (l.sku === line.sku ? { ...line, qty: Math.min(l.qty + line.qty, 20, line.stock) } : l))
            : [...s.cart, line];
          return { cart, cartOpen: true };
        }),
      setQty: (sku, qty) =>
        set((s) => ({ cart: s.cart.map((l) => (l.sku === sku ? { ...l, qty: Math.max(1, Math.min(qty, 20, l.stock)) } : l)) })),
      remove: (sku) => set((s) => ({ cart: s.cart.filter((l) => l.sku !== sku) })),
      clear: () => set({ cart: [] }),
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
