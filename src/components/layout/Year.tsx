"use client";
import { useSyncExternalStore } from "react";
const noop = () => () => {};
export function Year() {
  const y = useSyncExternalStore(noop, () => new Date().getFullYear(), () => 2026);
  return <>{y}</>;
}
