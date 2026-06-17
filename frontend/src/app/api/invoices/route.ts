import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateGoldInvoice } from "@/lib/calculations";

const invoiceSchema = z.object({
  shopName: z.string().min(1),
  sellerName: z.string().min(1),
  customer: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(7)
  }),
  product: z.object({
    type: z.string().min(1),
    sku: z.string().min(1),
    description: z.string().optional().default("")
  }),
  domestic18kGoldPrice: z.number().positive(),
  weight: z.number().positive(),
  unit: z.enum(["gram", "mithqal", "ounce", "kilogram"]),
  selectedKarat: z.number().int().min(1),
  wagePercent: z.number().min(0),
  profitPercent: z.number().min(0),
  taxPercent: z.number().min(0),
  discountType: z.enum(["amount", "percent"]),
  discount: z.number().min(0),
  fixedServiceFee: z.number().min(0).default(0)
});

function createInvoiceNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `INV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(request: Request) {
  const payload = invoiceSchema.parse(await request.json());
  const totals = calculateGoldInvoice(payload);

  return NextResponse.json(
    {
      invoiceNumber: createInvoiceNumber(),
      createdAt: new Date().toISOString(),
      persisted: false,
      warning: "این نسخه روی Vercel بدون پایگاه داده دائمی اجرا شده و فاکتور فقط برای چاپ تولید می‌شود.",
      ...totals
    },
    { status: 201 }
  );
}
