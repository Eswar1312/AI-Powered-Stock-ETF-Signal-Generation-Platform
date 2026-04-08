export function currencySymbolForTicker(ticker) {
  const t = String(ticker || "").toUpperCase().trim();
  if (t.endsWith(".NS") || t.endsWith(".BO")) return "₹";
  return "$";
}

export function currencySymbolForRegion(region) {
  const r = String(region || "").toUpperCase().trim();
  if (r === "IN") return "₹";
  return "$";
}

export function formatPrice(value, symbol = "$", digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${symbol}--`;
  return `${symbol}${num.toFixed(digits)}`;
}
