"use client";
import { useMemo, useSyncExternalStore } from "react";
import { useShop } from "@/store/shop";
import { site } from "@/config/site";

/** True after hydration — avoids SSR/localStorage mismatch. */
export function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

/**
 * Cart totals for DISPLAY only, from the snapshot stored in each line.
 * Final prices, stock and shipping are always recalculated by the database at checkout.
 */
export function useCartLines() {
  const cart = useShop((s) => s.cart);
  return useMemo(() => {
    const lines = cart.map((l) => ({ ...l, total: l.price * l.qty }));
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const shipping = subtotal === 0 || subtotal >= site.shipping.freeOver ? 0 : site.shipping.flatRate;
    const count = lines.reduce((s, l) => s + l.qty, 0);
    return { lines, subtotal, shipping, total: subtotal + shipping, count };
  }, [cart]);
}
