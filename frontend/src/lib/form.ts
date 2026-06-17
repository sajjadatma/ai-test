import type {
  CurrencyCode,
  NormalizedSellerForm,
  SellerForm,
  UnitCode
} from "@/types/invoice";

const localizedDigits: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9"
};

export type FormErrors = Partial<Record<keyof SellerForm, string>>;

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹٠-٩]/g, (digit) => localizedDigits[digit] ?? digit)
    .replace(/[٫]/g, ".")
    .replace(/[,٬،]/g, "")
    .trim();
}

export function parseLocalizedNumber(value: string) {
  const normalized = normalizeDigits(value).replace(/\s/g, "");
  if (!normalized || normalized === "-" || normalized === ".") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumericInput(value: string, maxFractionDigits = 4) {
  const parsed = parseLocalizedNumber(value);
  if (parsed === null) {
    return "";
  }

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: maxFractionDigits
  }).format(parsed);
}

export function normalizePhoneNumber(value: string) {
  return normalizeDigits(value).replace(/\D/g, "");
}

function validateNumericField(
  form: SellerForm,
  key: keyof SellerForm,
  label: string,
  options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
  } = {}
) {
  const value = parseLocalizedNumber(String(form[key] ?? ""));

  if (value === null) {
    return `${label} را وارد کنید.`;
  }

  if (!options.allowZero && value === 0) {
    return `${label} باید بیشتر از صفر باشد.`;
  }

  if (typeof options.min === "number" && value < options.min) {
    return `${label} نمی‌تواند کمتر از ${options.min} باشد.`;
  }

  if (typeof options.max === "number" && value > options.max) {
    return `${label} نمی‌تواند بیشتر از ${options.max} باشد.`;
  }

  return "";
}

export function validateSellerForm(
  form: SellerForm,
  mode: "calculate" | "invoice"
): FormErrors {
  const errors: FormErrors = {};

  errors.domestic18kGoldPrice = validateNumericField(form, "domestic18kGoldPrice", "قیمت طلای ۱۸ عیار");
  errors.weight = validateNumericField(form, "weight", "وزن");
  errors.wagePercent = validateNumericField(form, "wagePercent", "درصد اجرت ساخت", {
    min: 0,
    max: 1000,
    allowZero: true
  });
  errors.profitPercent = validateNumericField(form, "profitPercent", "درصد سود فروشنده", {
    min: 0,
    max: 1000,
    allowZero: true
  });
  errors.taxPercent = validateNumericField(form, "taxPercent", "درصد مالیات", {
    min: 0,
    max: 100,
    allowZero: true
  });

  if (!form.unit) {
    errors.unit = "واحد وزن را انتخاب کنید.";
  }

  if (!form.selectedKarat) {
    errors.selectedKarat = "عیار را انتخاب کنید.";
  }

  if (!form.selectedCurrency) {
    errors.selectedCurrency = "واحد نمایش مبلغ را انتخاب کنید.";
  }

  if (mode === "invoice") {
    if (!form.shopName.trim()) {
      errors.shopName = "نام فروشگاه را وارد کنید.";
    }
    if (!form.sellerName.trim()) {
      errors.sellerName = "نام فروشنده را وارد کنید.";
    }
    if (!form.customerName.trim()) {
      errors.customerName = "نام مشتری را وارد کنید.";
    }
    const phone = normalizePhoneNumber(form.customerPhone);
    if (!phone) {
      errors.customerPhone = "شماره تماس مشتری را وارد کنید.";
    } else if (phone.length < 10 || phone.length > 11) {
      errors.customerPhone = "شماره تماس باید ۱۰ یا ۱۱ رقم باشد.";
    }
    if (!form.productType.trim()) {
      errors.productType = "نوع کالا را وارد کنید.";
    }
  }

  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value))
  ) as FormErrors;
}

export function normalizeSellerForm(form: SellerForm): NormalizedSellerForm {
  return {
    shopName: form.shopName.trim(),
    sellerName: form.sellerName.trim(),
    customerName: form.customerName.trim(),
    customerPhone: normalizePhoneNumber(form.customerPhone),
    productType: form.productType.trim(),
    domestic18kGoldPrice: parseLocalizedNumber(form.domestic18kGoldPrice) ?? 0,
    selectedCurrency: form.selectedCurrency as CurrencyCode,
    currencyRates: form.currencyRates,
    weight: parseLocalizedNumber(form.weight) ?? 0,
    unit: form.unit as UnitCode,
    selectedKarat: Number(form.selectedKarat ?? 0),
    wagePercent: parseLocalizedNumber(form.wagePercent) ?? 0,
    profitPercent: parseLocalizedNumber(form.profitPercent) ?? 0,
    taxPercent: parseLocalizedNumber(form.taxPercent) ?? 0
  };
}
