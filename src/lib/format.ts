export function formatPKR(amount: number) {
  return "Rs " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
}

export function discountPct(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
