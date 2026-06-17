import type { CalculationResult, UnitCode } from "@/types/invoice";

const unitFactors: Record<UnitCode, number> = {
  gram: 1,
  mithqal: 4.6083,
  ounce: 31.1034768,
  kilogram: 1000
};

const roundMoney = (value: number) => Math.round(Number.isFinite(value) ? value : 0);
const roundWeight = (value: number) => Math.round(value * 10000) / 10000;

export function convertUnitToGram(weight: number, unit: UnitCode) {
  return roundWeight((Number(weight) || 0) * unitFactors[unit]);
}

export function calculateGoldInvoice(input: {
  domestic18kGoldPrice: number;
  weight: number;
  unit: UnitCode;
  selectedKarat: number;
  wagePercent: number;
  profitPercent: number;
  taxPercent: number;
  discountType?: "amount" | "percent";
  discount?: number;
  fixedServiceFee?: number;
}): CalculationResult {
  const convertedWeightInGram = convertUnitToGram(input.weight, input.unit);
  const adjustedGoldPrice = roundMoney(
    (input.domestic18kGoldPrice * input.selectedKarat) / 18
  );
  const rawGoldPrice = roundMoney(adjustedGoldPrice * convertedWeightInGram);
  const wageAmount = roundMoney((rawGoldPrice * input.wagePercent) / 100);
  const profitAmount = roundMoney(
    ((rawGoldPrice + wageAmount) * input.profitPercent) / 100
  );
  const subtotal = roundMoney(
    rawGoldPrice + wageAmount + profitAmount + (input.fixedServiceFee ?? 0)
  );
  const taxAmount = roundMoney((subtotal * input.taxPercent) / 100);
  const discountAmount = roundMoney(
    (input.discountType ?? "amount") === "percent"
      ? (subtotal * (input.discount ?? 0)) / 100
      : (input.discount ?? 0)
  );
  const finalPrice = Math.max(0, roundMoney(subtotal + taxAmount - discountAmount));

  return {
    convertedWeightInGram,
    adjustedGoldPrice,
    rawGoldPrice,
    wageAmount,
    profitAmount,
    subtotal,
    taxAmount,
    discountAmount,
    finalPrice
  };
}
