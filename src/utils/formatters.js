// Currency and number formatters (Thai locale)

export const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export const numberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 1,
});

export function formatMoney(value) {
  return moneyFormatter.format(value);
}

export function formatPlain(value) {
  return numberFormatter.format(value);
}

export function scaleMoney(value, scale) {
  return Math.round(value * scale);
}
