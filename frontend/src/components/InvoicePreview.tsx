"use client";

import { formatCurrencyAmount, formatDateTime, formatNumber } from "@/lib/format";
import type { CalculationResult, SavedInvoice, SellerForm } from "@/types/invoice";

const unitLabels: Record<string, string> = {
  gram: "گرم",
  mithqal: "مثقال",
  ounce: "اونس",
  kilogram: "کیلوگرم"
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200/80 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900 sm:text-left">{value}</span>
    </div>
  );
}

export function InvoicePreview({
  form,
  totals,
  invoice
}: {
  form: SellerForm;
  totals: CalculationResult;
  invoice?: SavedInvoice | null;
}) {
  const invoiceNumber = invoice?.invoiceNumber ?? "پیش‌فاکتور";
  const createdAt = invoice?.createdAt ?? new Date().toISOString();
  const money = (value: number) =>
    formatCurrencyAmount(value, form.selectedCurrency, form.currencyRates);

  return (
    <section className="print-area rounded-[24px] border border-[#d9c2ff] bg-white p-4 text-slate-950 shadow-[0_20px_80px_rgba(103,80,164,0.14)] sm:rounded-[28px] sm:p-6">
      <div className="flex flex-col gap-3 border-b border-[#e6d7ff] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6750a4]">فاکتور فروش طلا و جواهر</p>
          <h2 className="mt-1 text-xl font-black leading-9 sm:text-2xl">{form.shopName || "نام فروشگاه"}</h2>
          <p className="mt-2 text-sm text-slate-600">فروشنده: {form.sellerName || "-"}</p>
        </div>
        <div className="rounded-2xl bg-[#f7f2fa] px-4 py-3 text-right text-sm">
          <p className="font-bold text-slate-900">شماره: {invoiceNumber}</p>
          <p className="mt-1 text-slate-600">تاریخ: {formatDateTime(createdAt)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2">
        <div className="rounded-2xl bg-[#fcf8ff] p-4">
          <h3 className="mb-2 text-sm font-black text-[#4f378a]">مشخصات مشتری</h3>
          <Row label="نام مشتری" value={form.customerName || "-"} />
          <Row label="شماره تماس" value={form.customerPhone || "-"} />
        </div>
        <div className="rounded-2xl bg-[#fcf8ff] p-4">
          <h3 className="mb-2 text-sm font-black text-[#4f378a]">مشخصات کالا</h3>
          <Row label="نوع کالا" value={form.productType || "-"} />
        </div>
      </div>

      <div className="mt-5 grid gap-x-8 rounded-2xl border border-slate-200/80 p-4 md:grid-cols-2">
        <Row label="وزن" value={`${formatNumber(form.weight)} ${unitLabels[form.unit || "gram"]}`} />
        <Row label="وزن تبدیل‌شده" value={`${formatNumber(totals.convertedWeightInGram)} گرم`} />
        <Row label="عیار" value={`${formatNumber(form.selectedKarat || 0)} عیار`} />
        <Row label="قیمت هر گرم" value={money(totals.adjustedGoldPrice)} />
        <Row label="قیمت خام طلا" value={money(totals.rawGoldPrice)} />
        <Row label="اجرت ساخت" value={money(totals.wageAmount)} />
        <Row label="سود فروشنده" value={money(totals.profitAmount)} />
        <Row label="مالیات" value={money(totals.taxAmount)} />
        {totals.discountAmount > 0 ? (
          <Row label="تخفیف" value={money(totals.discountAmount)} />
        ) : null}
        <div className="mt-4 flex flex-col gap-2 rounded-[20px] bg-[#4f378a] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5 md:col-span-2">
          <span className="text-sm">مبلغ قابل پرداخت</span>
          <strong className="text-xl leading-9 sm:text-2xl">{money(totals.finalPrice)}</strong>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 text-center text-sm text-slate-600 sm:mt-10 sm:gap-8">
        <div className="border-t border-slate-400 pt-3">امضای فروشنده</div>
        <div className="border-t border-slate-400 pt-3">امضای مشتری</div>
      </div>
    </section>
  );
}
