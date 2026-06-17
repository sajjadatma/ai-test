"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  FileText,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Sun,
  X
} from "lucide-react";
import { InvoicePreview } from "@/components/InvoicePreview";
import { getMarketRates, saveInvoice } from "@/lib/api";
import { calculateGoldInvoice } from "@/lib/calculations";
import {
  type FormErrors,
  normalizeSellerForm,
  validateSellerForm
} from "@/lib/form";
import {
  currencyLabels,
  formatCurrencyAmount,
  formatNumber
} from "@/lib/format";
import type { CurrencyCode, MarketRates, SavedInvoice, SellerForm } from "@/types/invoice";

const currencyOptions: Array<{ code: CurrencyCode; label: string }> = [
  { code: "TOMAN", label: "تومان" },
  { code: "RIAL", label: "ریال" },
  { code: "USD", label: "دلار" },
  { code: "EUR", label: "یورو" },
  { code: "AED", label: "درهم" }
];

const emptyForm: SellerForm = {
  shopName: "",
  sellerName: "",
  customerName: "",
  customerPhone: "",
  productType: "",
  domestic18kGoldPrice: "",
  selectedCurrency: "TOMAN",
  currencyRates: {
    TOMAN: 1,
    RIAL: 0.1,
    USD: 0,
    EUR: 0,
    AED: 0
  },
  weight: "",
  unit: "",
  selectedKarat: "",
  wagePercent: "",
  profitPercent: "",
  taxPercent: ""
};

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
};

function Field({
  label,
  error,
  helperText,
  required,
  children
}: {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-sm font-medium text-[var(--md-muted)]">
        {label}
        {required ? <span className="text-[#b3261e]">*</span> : null}
      </span>
      {children}
      <span
        className={`mt-2 block min-h-5 text-xs ${
          error ? "text-[#b3261e]" : "text-[var(--md-muted)]"
        }`}
      >
        {error || helperText || ""}
      </span>
    </label>
  );
}

function TextInput({
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`h-14 w-full min-w-0 rounded-[20px] border bg-[var(--md-panel)] px-4 text-base text-[var(--md-text)] outline-none transition placeholder:text-[var(--md-muted)] focus:bg-[var(--md-surface-solid)] focus:ring-2 ${
        error
          ? "border-[#b3261e] focus:border-[#b3261e] focus:ring-[#f9dedc]"
          : "border-[var(--md-outline)] focus:border-[var(--md-accent)] focus:ring-[color:var(--md-accent-soft)]"
      } ${className}`}
    />
  );
}

function NumberInput({
  value,
  onValueChange,
  error,
  readOnly,
  placeholder
}: {
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      inputMode="decimal"
      dir="ltr"
      error={error}
      readOnly={readOnly}
      placeholder={placeholder}
      className={readOnly ? "bg-[var(--md-surface-muted)] text-[var(--md-text)]" : ""}
    />
  );
}

function Select({
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={`h-14 w-full min-w-0 rounded-[20px] border bg-[var(--md-panel)] px-4 text-base text-[var(--md-text)] outline-none transition focus:bg-[var(--md-surface-solid)] focus:ring-2 ${
        error
          ? "border-[#b3261e] focus:border-[#b3261e] focus:ring-[#f9dedc]"
          : "border-[var(--md-outline)] focus:border-[var(--md-accent)] focus:ring-[color:var(--md-accent-soft)]"
      }`}
    >
      {children}
    </select>
  );
}

function Card({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-solid)] p-4 shadow-[0_10px_24px_rgba(28,27,31,0.08)] sm:p-5">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[var(--md-text)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--md-muted)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--md-outline)] py-3 text-sm">
      <span className="text-[var(--md-muted)]">{label}</span>
      <strong className="text-left text-[var(--md-text)]">{value}</strong>
    </div>
  );
}

export default function DashboardPage() {
  const [form, setForm] = useState<SellerForm>(emptyForm);
  const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isRatesLoading, setIsRatesLoading] = useState(true);
  const [isRatesRefreshing, setIsRatesRefreshing] = useState(false);
  const [ratesInfo, setRatesInfo] = useState<MarketRates | null>(null);
  const [ratesError, setRatesError] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const normalizedForm = useMemo(() => normalizeSellerForm(form), [form]);
  const totals = useMemo(
    () =>
      calculateGoldInvoice({
        domestic18kGoldPrice: normalizedForm.domestic18kGoldPrice,
        weight: normalizedForm.weight,
        unit: normalizedForm.unit || "gram",
        selectedKarat: normalizedForm.selectedKarat,
        wagePercent: normalizedForm.wagePercent,
        profitPercent: normalizedForm.profitPercent,
        taxPercent: normalizedForm.taxPercent
      }),
    [normalizedForm]
  );

  const money = (value: number) =>
    formatCurrencyAmount(value, form.selectedCurrency, form.currencyRates);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("gold-shop-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.body.dataset.theme = savedTheme;
      return;
    }

    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = preferredDark ? "dark" : "light";
    setTheme(nextTheme);
    document.body.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem("gold-shop-theme", theme);
  }, [theme]);

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3500);
  };

  const update = <K extends keyof SellerForm>(key: K, value: SellerForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const loadRates = async (background = false) => {
    if (background) {
      setIsRatesRefreshing(true);
    } else {
      setIsRatesLoading(true);
    }

    try {
      const marketRates = await getMarketRates();
      setRatesInfo(marketRates);
      setRatesError("");
      setForm((current) => ({
        ...current,
        domestic18kGoldPrice: marketRates.domestic18kPrice
          ? formatNumber(marketRates.domestic18kPrice)
          : "",
        currencyRates: marketRates.currencyRates
      }));
    } catch (error) {
      setRatesError(
        error instanceof Error
          ? error.message
          : "دریافت قیمت طلا از API با خطا مواجه شد."
      );
    } finally {
      setIsRatesLoading(false);
      setIsRatesRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRates();
  }, []);

  const runValidation = (mode: "calculate" | "invoice") => {
    const errors = validateSellerForm(form, mode);
    setFieldErrors(errors);
    return errors;
  };

  const handleCalculate = (event: FormEvent) => {
    event.preventDefault();
    const errors = runValidation("calculate");
    if (Object.keys(errors).length > 0) {
      showToast({ type: "error", message: "لطفا خطاهای فرم را برطرف کنید." });
      return;
    }

    showToast({ type: "success", message: "محاسبه با موفقیت انجام شد." });
  };

  const handleReset = () => {
    setForm((current) => ({
      ...emptyForm,
      selectedCurrency: current.selectedCurrency,
      currencyRates: current.currencyRates,
      domestic18kGoldPrice: ratesInfo?.domestic18kPrice
        ? formatNumber(ratesInfo.domestic18kPrice)
        : ""
    }));
    setFieldErrors({});
    setInvoice(null);
    showToast({ type: "info", message: "فیلدهای فرم پاک شدند." });
  };

  const handleGenerateInvoice = async () => {
    const errors = runValidation("invoice");
    if (Object.keys(errors).length > 0) {
      showToast({ type: "error", message: "برای صدور فاکتور، خطاهای فرم را کامل برطرف کنید." });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveInvoice(form);
      setInvoice(saved);
      setIsInvoiceOpen(true);
      showToast({
        type: "success",
        message:
          saved.persisted === false
            ? "فاکتور آماده شد، اما به‌صورت دائمی ذخیره نشد."
            : "فاکتور با موفقیت ذخیره و آماده چاپ شد."
      });
    } catch (error) {
      const localInvoice: SavedInvoice = {
        invoiceNumber: `LOCAL-${Date.now()}`,
        createdAt: new Date().toISOString(),
        persisted: false,
        warning: "ارتباط با سرور برقرار نشد؛ فاکتور فقط برای مشاهده و چاپ تولید شد.",
        ...totals
      };
      setInvoice(localInvoice);
      setIsInvoiceOpen(true);
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "فاکتور محلی برای مشاهده و چاپ آماده شد."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="page-shell min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {toast ? (
        <div
          className={`no-print fixed left-4 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-2xl px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.24)] ${
            toast.type === "error"
              ? "bg-[#b3261e] text-white"
              : toast.type === "success"
                ? "bg-[#1e7b34] text-white"
                : "bg-[var(--md-toast)] text-[var(--md-surface-solid)]"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="no-print mx-auto mb-4 max-w-7xl rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 shadow-[0_8px_28px_rgba(28,27,31,0.08)] backdrop-blur sm:mb-6 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--md-accent)] sm:text-sm">داشبورد فروش روزانه</p>
            <h1 className="mt-1 text-lg font-bold leading-8 text-[var(--md-text)] sm:text-2xl">
              محاسبه قیمت و صدور فاکتور فروش
            </h1>
            <p className="mt-1 text-sm text-[var(--md-muted)]">
              نرخ طلای ۱۸ عیار و ارزها به‌صورت زنده از API خوانده می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:gap-3 lg:min-w-[420px]">
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              className="flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-solid)] px-4 text-sm font-bold text-[var(--md-text)] transition hover:bg-[var(--md-surface-muted)]"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              {theme === "light" ? "حالت شب" : "حالت روشن"}
            </button>
            <div className="rounded-[20px] bg-[var(--md-accent-strong)] px-3 py-2.5 text-white sm:px-5 sm:py-4">
              <p className="text-[11px] text-white/80 sm:text-sm">
                مبلغ نهایی به {currencyLabels[form.selectedCurrency]}
              </p>
              <p className="mt-1 text-lg font-black leading-8 sm:text-3xl">
                {money(totals.finalPrice)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleCalculate}
        className="no-print mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]"
      >
        <div className="grid gap-4 sm:gap-5">
          <Card title="نرخ مرجع طلا" subtitle="دریافت خودکار از API و تبدیل به قیمت ۱۸ عیار">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="قیمت هر گرم طلای ۱۸ عیار"
                error={fieldErrors.domestic18kGoldPrice}
                helperText={
                  ratesInfo
                    ? `آخرین به‌روزرسانی: ${ratesInfo.updatedAt}`
                    : isRatesLoading
                      ? "در حال دریافت نرخ..."
                      : "قیمت از API خوانده می‌شود."
                }
                required
              >
                <NumberInput
                  value={form.domestic18kGoldPrice}
                  onValueChange={(value) => update("domestic18kGoldPrice", value)}
                  readOnly
                  error={Boolean(fieldErrors.domestic18kGoldPrice)}
                  placeholder="پس از دریافت API نمایش داده می‌شود"
                />
              </Field>

              <Field
                label="واحد نمایش مبلغ"
                error={fieldErrors.selectedCurrency}
                helperText="نتایج محاسبه و فاکتور با این واحد نمایش داده می‌شوند."
                required
              >
                <Select
                  value={form.selectedCurrency}
                  onChange={(event) =>
                    update("selectedCurrency", event.target.value as CurrencyCode)
                  }
                  error={Boolean(fieldErrors.selectedCurrency)}
                >
                  {currencyOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-2 flex flex-col gap-3 rounded-[20px] bg-[var(--md-panel)] p-4 text-sm text-[var(--md-muted)] sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p>نرخ جهانی طلا: {ratesInfo ? `${formatNumber(ratesInfo.globalGoldPrice)} دلار/اونس` : "-"}</p>
                <p>نرخ دلار: {ratesInfo ? `${formatNumber(ratesInfo.usdExchangeRate)} تومان` : "-"}</p>
                <p className="text-xs">
                  منبع:
                  {" "}
                  <a
                    className="underline"
                    href="https://goldprice.org"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GoldPrice.org
                  </a>
                  {" + "}
                  <a
                    className="underline"
                    href="https://www.exchangerate-api.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ExchangeRate-API
                  </a>
                </p>
                {ratesError ? <p className="text-[#b3261e]">{ratesError}</p> : null}
              </div>

              <button
                type="button"
                onClick={() => void loadRates(true)}
                disabled={isRatesLoading || isRatesRefreshing}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--md-outline)] px-4 font-bold text-[var(--md-text)] transition hover:bg-[var(--md-surface-muted)] disabled:opacity-60"
              >
                <RefreshCw
                  size={18}
                  className={isRatesRefreshing || isRatesLoading ? "animate-spin" : ""}
                />
                {isRatesRefreshing || isRatesLoading ? "در حال به‌روزرسانی" : "به‌روزرسانی نرخ"}
              </button>
            </div>
          </Card>

          <Card title="مشخصات مشتری و کالا" subtitle="برای صدور فاکتور این بخش الزامی است.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="نام فروشگاه"
                error={fieldErrors.shopName}
                helperText="روی فاکتور نمایش داده می‌شود."
                required
              >
                <TextInput
                  value={form.shopName}
                  onChange={(event) => update("shopName", event.target.value)}
                  error={Boolean(fieldErrors.shopName)}
                  placeholder="مثلاً گالری طلای پارسیان"
                />
              </Field>
              <Field
                label="نام فروشنده"
                error={fieldErrors.sellerName}
                helperText="روی فاکتور نمایش داده می‌شود."
                required
              >
                <TextInput
                  value={form.sellerName}
                  onChange={(event) => update("sellerName", event.target.value)}
                  error={Boolean(fieldErrors.sellerName)}
                  placeholder="مثلاً علی رضایی"
                />
              </Field>
              <Field
                label="نام و نام خانوادگی مشتری"
                error={fieldErrors.customerName}
                helperText="برای ذخیره و صدور فاکتور لازم است."
                required
              >
                <TextInput
                  value={form.customerName}
                  onChange={(event) => update("customerName", event.target.value)}
                  error={Boolean(fieldErrors.customerName)}
                  placeholder="نام مشتری"
                />
              </Field>
              <Field
                label="شماره تماس مشتری"
                error={fieldErrors.customerPhone}
                helperText="۱۰ یا ۱۱ رقم، با یا بدون صفر اول."
                required
              >
                <TextInput
                  value={form.customerPhone}
                  onChange={(event) => update("customerPhone", event.target.value)}
                  error={Boolean(fieldErrors.customerPhone)}
                  inputMode="tel"
                  dir="ltr"
                  placeholder="0912..."
                />
              </Field>
              <Field
                label="نوع کالا"
                error={fieldErrors.productType}
                helperText="مثلاً انگشتر، گردنبند یا دستبند."
                required
              >
                <TextInput
                  value={form.productType}
                  onChange={(event) => update("productType", event.target.value)}
                  error={Boolean(fieldErrors.productType)}
                  placeholder="نوع کالا"
                />
              </Field>
            </div>
          </Card>

          <Card title="وزن، عیار و کارمزدها" subtitle="همه اعداد را می‌توانید با نقطه اعشاری وارد کنید.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="وزن"
                error={fieldErrors.weight}
                helperText="مثلاً 4.25"
                required
              >
                <NumberInput
                  value={form.weight}
                  onValueChange={(value) => update("weight", value)}
                  error={Boolean(fieldErrors.weight)}
                  placeholder="0.00"
                />
              </Field>

              <Field
                label="واحد وزن"
                error={fieldErrors.unit}
                helperText="واحد انتخابی به گرم تبدیل می‌شود."
                required
              >
                <Select
                  value={form.unit}
                  onChange={(event) =>
                    update("unit", event.target.value as SellerForm["unit"])
                  }
                  error={Boolean(fieldErrors.unit)}
                >
                  <option value="">انتخاب واحد</option>
                  <option value="gram">گرم</option>
                  <option value="mithqal">مثقال</option>
                  <option value="ounce">اونس</option>
                  <option value="kilogram">کیلوگرم</option>
                </Select>
              </Field>

              <Field
                label="عیار"
                error={fieldErrors.selectedKarat}
                helperText="قیمت ۱۸ عیار بر همین اساس تعدیل می‌شود."
                required
              >
                <Select
                  value={String(form.selectedKarat)}
                  onChange={(event) =>
                    update(
                      "selectedKarat",
                      event.target.value ? Number(event.target.value) : ""
                    )
                  }
                  error={Boolean(fieldErrors.selectedKarat)}
                >
                  <option value="">انتخاب عیار</option>
                  {[24, 22, 21, 18, 17, 14].map((karat) => (
                    <option key={karat} value={karat}>
                      {karat} عیار
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="درصد اجرت ساخت"
                error={fieldErrors.wagePercent}
                helperText="مثلاً 12.5"
                required
              >
                <NumberInput
                  value={form.wagePercent}
                  onValueChange={(value) => update("wagePercent", value)}
                  error={Boolean(fieldErrors.wagePercent)}
                  placeholder="0.00"
                />
              </Field>

              <Field
                label="درصد سود فروشنده"
                error={fieldErrors.profitPercent}
                helperText="مثلاً 7.25"
                required
              >
                <NumberInput
                  value={form.profitPercent}
                  onValueChange={(value) => update("profitPercent", value)}
                  error={Boolean(fieldErrors.profitPercent)}
                  placeholder="0.00"
                />
              </Field>

              <Field
                label="درصد مالیات"
                error={fieldErrors.taxPercent}
                helperText="معمولاً مقدار مثبت و محدود."
                required
              >
                <NumberInput
                  value={form.taxPercent}
                  onValueChange={(value) => update("taxPercent", value)}
                  error={Boolean(fieldErrors.taxPercent)}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="grid content-start gap-4 sm:gap-5 lg:sticky lg:top-4 lg:self-start">
          <Card title="خلاصه محاسبه" subtitle="مبالغ بر اساس واحد انتخابی شما نمایش داده می‌شوند.">
            <BreakdownRow
              label="وزن تبدیل‌شده"
              value={`${formatNumber(totals.convertedWeightInGram)} گرم`}
            />
            <BreakdownRow
              label="قیمت هر گرم"
              value={money(totals.adjustedGoldPrice)}
            />
            <BreakdownRow label="قیمت خام طلا" value={money(totals.rawGoldPrice)} />
            <BreakdownRow label="اجرت ساخت" value={money(totals.wageAmount)} />
            <BreakdownRow label="سود فروشنده" value={money(totals.profitAmount)} />
            <BreakdownRow label="جمع قبل از مالیات" value={money(totals.subtotal)} />
            <BreakdownRow label="مالیات" value={money(totals.taxAmount)} />
            <div className="mt-4 rounded-[24px] bg-[var(--md-accent-soft)] px-4 py-4 text-[var(--md-accent-strong)]">
              <p className="text-sm font-medium">قابل پرداخت</p>
              <p className="mt-1 text-2xl font-black leading-10 sm:text-3xl">
                {money(totals.finalPrice)}
              </p>
            </div>
          </Card>

          <div className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-solid)] p-4 shadow-[0_8px_24px_rgba(28,27,31,0.08)]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--md-accent)] px-5 font-bold text-white transition hover:brightness-110"
              >
                <Calculator size={18} /> محاسبه
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--md-outline-strong)] bg-transparent px-5 font-bold text-[var(--md-text)] transition hover:bg-[var(--md-surface-muted)]"
              >
                <RotateCcw size={18} /> پاک کردن فرم
              </button>
              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isSaving || isRatesLoading}
                className="sm:col-span-2 lg:col-span-1 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--md-accent-soft)] px-5 font-bold text-[var(--md-accent-strong)] transition hover:brightness-95 disabled:opacity-60"
              >
                {isSaving ? <Save size={18} /> : <FileText size={18} />}
                {isSaving ? "در حال صدور" : "صدور فاکتور"}
              </button>
            </div>
          </div>
        </aside>
      </form>

      {isInvoiceOpen && invoice ? (
        <div className="invoice-modal fixed inset-0 z-40 bg-[#1d1b20]/50 p-0 backdrop-blur-sm sm:p-4">
          <div className="invoice-modal-shell mx-auto flex h-full max-w-4xl flex-col overflow-hidden bg-[var(--md-surface-solid)] shadow-[0_24px_64px_rgba(28,27,31,0.24)] sm:rounded-[32px]">
            <div className="no-print flex items-start justify-between gap-3 border-b border-[var(--md-outline)] bg-[var(--md-surface-muted)] px-4 py-4 text-[var(--md-text)] sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--md-accent)]">پیش‌نمایش فاکتور</p>
                {invoice.warning ? (
                  <p className="mt-1 text-xs text-[var(--md-muted)]">{invoice.warning}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--md-outline-strong)] px-3 text-sm font-bold text-[var(--md-text)] transition hover:bg-[var(--md-surface-solid)] sm:px-4"
                >
                  چاپ فاکتور
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--md-surface-solid)] text-[var(--md-text)] transition hover:bg-[var(--md-panel)]"
                  aria-label="بستن"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-auto bg-[var(--md-panel)] p-3 sm:p-4">
              <InvoicePreview form={form} totals={invoice} invoice={invoice} />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
