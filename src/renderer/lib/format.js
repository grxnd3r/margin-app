export const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export const PCT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatPct(value) {
  return PCT.format((Number(value || 0) || 0) / 100);
}


