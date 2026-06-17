import { normalizeSellerForm } from "@/lib/form";
import type { MarketRates, SavedInvoice, SellerForm } from "@/types/invoice";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? "در ارتباط با سرور خطا رخ داد.");
  }

  return response.json();
}

export function saveInvoice(form: SellerForm) {
  const normalized = normalizeSellerForm(form);

  return request<SavedInvoice>("/invoices", {
    method: "POST",
    body: JSON.stringify({
      shopName: normalized.shopName,
      sellerName: normalized.sellerName,
      customer: {
        fullName: normalized.customerName,
        phone: normalized.customerPhone
      },
      product: {
        type: normalized.productType,
        sku: `AUTO-${Date.now()}`,
        description: ""
      },
      domestic18kGoldPrice: normalized.domestic18kGoldPrice,
      weight: normalized.weight,
      unit: normalized.unit,
      selectedKarat: normalized.selectedKarat,
      wagePercent: normalized.wagePercent,
      profitPercent: normalized.profitPercent,
      taxPercent: normalized.taxPercent,
      discountType: "amount",
      discount: 0,
      fixedServiceFee: 0
    })
  });
}

export function getMarketRates() {
  return request<MarketRates>("/market-rates");
}
