export type UnitCode = "gram" | "mithqal" | "ounce" | "kilogram";
export type DiscountType = "amount" | "percent";

export interface CalculationInput {
  domestic18kGoldPrice: number;
  weight: number;
  unit: UnitCode;
  selectedKarat: number;
  wagePercent: number;
  profitPercent: number;
  taxPercent: number;
  discountType: DiscountType;
  discount: number;
  fixedServiceFee: number;
}

export interface CalculationResult {
  convertedWeightInGram: number;
  adjustedGoldPrice: number;
  rawGoldPrice: number;
  wageAmount: number;
  profitAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  finalPrice: number;
}

const unitFactors: Record<UnitCode, number> = {
  gram: 1,
  mithqal: 4.6083,
  ounce: 31.1034768,
  kilogram: 1000
};

const roundMoney = (value: number) => Math.round(value);
const roundWeight = (value: number) => Math.round(value * 10000) / 10000;

export function convertUnitToGram(weight: number, unit: UnitCode) {
  return roundWeight(weight * unitFactors[unit]);
}

export function calculateInvoice(input: CalculationInput): CalculationResult {
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
    rawGoldPrice + wageAmount + profitAmount + input.fixedServiceFee
  );
  const taxAmount = roundMoney((subtotal * input.taxPercent) / 100);
  const discountAmount = roundMoney(
    input.discountType === "percent" ? (subtotal * input.discount) / 100 : input.discount
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

export function createInvoiceNumber() {
  const now = new Date();
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  return `INV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}
