import { Router } from "express";
import type { PoolClient } from "pg";
import { z } from "zod";
import { pool, query } from "../db/pool.js";
import { calculateInvoice, createInvoiceNumber } from "../domain/calculations.js";

export const invoicesRouter = Router();

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

invoicesRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, invoice_number AS "invoiceNumber", shop_name AS "shopName", seller_name AS "sellerName",
              customer_name AS "customerName", customer_phone AS "customerPhone",
              final_price AS "finalPrice", created_at AS "createdAt"
       FROM invoices ORDER BY created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get("/:id", async (req, res, next) => {
  try {
    const [invoice, items] = await Promise.all([
      query(
        `SELECT id, invoice_number AS "invoiceNumber", shop_name AS "shopName", seller_name AS "sellerName",
                customer_name AS "customerName", customer_phone AS "customerPhone",
                domestic_18k_price AS "domestic18kPrice", selected_karat AS "selectedKarat",
                converted_weight_gram AS "convertedWeightGram", adjusted_gold_price AS "adjustedGoldPrice",
                raw_gold_price AS "rawGoldPrice", wage_amount AS "wageAmount", profit_amount AS "profitAmount",
                subtotal, tax_amount AS "taxAmount", discount_amount AS "discountAmount",
                final_price AS "finalPrice", created_at AS "createdAt"
         FROM invoices WHERE id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT id, product_type AS "productType", product_sku AS "productSku",
                product_description AS "productDescription", weight, unit, karat,
                price_per_gram AS "pricePerGram", raw_gold_price AS "rawGoldPrice",
                wage_percent AS "wagePercent", profit_percent AS "profitPercent",
                tax_percent AS "taxPercent", fixed_service_fee AS "fixedServiceFee",
                discount_type AS "discountType", discount_value AS "discountValue"
         FROM invoice_items WHERE invoice_id = $1`,
        [req.params.id]
      )
    ]);

    if (!invoice.rows[0]) {
      res.status(404).json({ message: "فاکتور پیدا نشد." });
      return;
    }

    res.json({ ...invoice.rows[0], items: items.rows });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/", async (req, res, next) => {
  let client: PoolClient | undefined;

  try {
    const input = invoiceSchema.parse(req.body);
    const totals = calculateInvoice(input);
    const invoiceNumber = createInvoiceNumber();

    try {
      client = await pool.connect();
    } catch (error) {
      if ((error as { code?: string })?.code === "ECONNREFUSED") {
        res.status(201).json({
          invoiceNumber,
          createdAt: new Date().toISOString(),
          persisted: false,
          warning: "پایگاه داده در دسترس نبود؛ فاکتور فقط برای چاپ تولید شد.",
          ...totals
        });
        return;
      }
      throw error;
    }

    await client.query("BEGIN");

    const customerResult = await client.query(
      `INSERT INTO customers (full_name, phone)
       VALUES ($1, $2)
       RETURNING id`,
      [input.customer.fullName, input.customer.phone]
    );

    const productResult = await client.query(
      `INSERT INTO products (type, sku, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (sku) DO UPDATE SET type = EXCLUDED.type, description = EXCLUDED.description
       RETURNING id`,
      [input.product.type, input.product.sku, input.product.description]
    );

    const invoiceResult = await client.query(
      `INSERT INTO invoices
       (invoice_number, shop_name, seller_name, customer_id, customer_name, customer_phone,
        domestic_18k_price, selected_karat, converted_weight_gram, adjusted_gold_price,
        raw_gold_price, wage_amount, profit_amount, subtotal, tax_amount, discount_amount, final_price)
       VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, invoice_number AS "invoiceNumber", created_at AS "createdAt"`,
      [
        invoiceNumber,
        input.shopName,
        input.sellerName,
        customerResult.rows[0].id,
        input.customer.fullName,
        input.customer.phone,
        input.domestic18kGoldPrice,
        input.selectedKarat,
        totals.convertedWeightInGram,
        totals.adjustedGoldPrice,
        totals.rawGoldPrice,
        totals.wageAmount,
        totals.profitAmount,
        totals.subtotal,
        totals.taxAmount,
        totals.discountAmount,
        totals.finalPrice
      ]
    );

    await client.query(
      `INSERT INTO invoice_items
       (invoice_id, product_id, product_type, product_sku, product_description, weight, unit,
        karat, price_per_gram, raw_gold_price, wage_percent, profit_percent, tax_percent,
        fixed_service_fee, discount_type, discount_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        invoiceResult.rows[0].id,
        productResult.rows[0].id,
        input.product.type,
        input.product.sku,
        input.product.description,
        input.weight,
        input.unit,
        input.selectedKarat,
        totals.adjustedGoldPrice,
        totals.rawGoldPrice,
        input.wagePercent,
        input.profitPercent,
        input.taxPercent,
        input.fixedServiceFee,
        input.discountType,
        input.discount
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      id: invoiceResult.rows[0].id,
      invoiceNumber: invoiceResult.rows[0].invoiceNumber,
      createdAt: invoiceResult.rows[0].createdAt,
      persisted: true,
      ...totals
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    next(error);
  } finally {
    client?.release();
  }
});
