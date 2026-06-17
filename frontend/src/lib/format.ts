import type { CurrencyCode } from "@/types/invoice";

export const currencyLabels: Record<CurrencyCode, string> = {
  TOMAN: "تومان",
  RIAL: "ریال"
};

export const tomanFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0
});

export const decimalFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 4
});

export function formatNumber(value: number | string) {
  return decimalFormatter.format(Number(value) || 0);
}

export function convertTomanToCurrency(
  valueInToman: number,
  selectedCurrency: CurrencyCode,
  currencyRates: Record<CurrencyCode, number>
) {
  const rateToToman = currencyRates[selectedCurrency];
  if (!rateToToman || !Number.isFinite(rateToToman)) {
    return 0;
  }
  return valueInToman / rateToToman;
}

export function formatCurrencyAmount(
  valueInToman: number | string,
  selectedCurrency: CurrencyCode,
  currencyRates: Record<CurrencyCode, number>
) {
  const numericValue = convertTomanToCurrency(
    Number(valueInToman) || 0,
    selectedCurrency,
    currencyRates
  );

  const formatter = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0
  });

  return `${formatter.format(numericValue)} ${currencyLabels[selectedCurrency]}`;
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}
