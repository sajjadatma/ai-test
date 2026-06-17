export type UnitCode = "gram" | "mithqal" | "ounce" | "kilogram";
export type CurrencyCode = "TOMAN" | "RIAL" | "USD" | "EUR" | "AED";

export interface SellerForm {
  shopName: string;
  sellerName: string;
  customerName: string;
  customerPhone: string;
  productType: string;
  domestic18kGoldPrice: string;
  selectedCurrency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  weight: string;
  unit: UnitCode | "";
  selectedKarat: number | "";
  wagePercent: string;
  profitPercent: string;
  taxPercent: string;
}

export interface NormalizedSellerForm {
  shopName: string;
  sellerName: string;
  customerName: string;
  customerPhone: string;
  productType: string;
  domestic18kGoldPrice: number;
  selectedCurrency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  weight: number;
  unit: UnitCode;
  selectedKarat: number;
  wagePercent: number;
  profitPercent: number;
  taxPercent: number;
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

export interface SavedInvoice extends CalculationResult {
  id?: string;
  invoiceNumber: string;
  createdAt: string;
  persisted?: boolean;
  warning?: string;
}

export interface MarketRates {
  globalGoldPrice: number;
  domestic18kPrice: number;
  usdExchangeRate: number;
  currencyRates: Record<CurrencyCode, number>;
  source: {
    gold: string;
    fx: string;
  };
  updatedAt: string;
}
