import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";

export const feePresetsRouter = Router();

const feePresetSchema = z.object({
  title: z.string().min(1),
  wagePercent: z.number().min(0),
  profitPercent: z.number().min(0),
  taxPercent: z.number().min(0),
  fixedServiceFee: z.number().min(0).default(0)
});

feePresetsRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, wage_percent AS "wagePercent", profit_percent AS "profitPercent",
              tax_percent AS "taxPercent", fixed_service_fee AS "fixedServiceFee", created_at AS "createdAt"
       FROM fee_presets ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

feePresetsRouter.post("/", async (req, res, next) => {
  try {
    const input = feePresetSchema.parse(req.body);
    const result = await query(
      `INSERT INTO fee_presets (title, wage_percent, profit_percent, tax_percent, fixed_service_fee)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, wage_percent AS "wagePercent", profit_percent AS "profitPercent",
                 tax_percent AS "taxPercent", fixed_service_fee AS "fixedServiceFee", created_at AS "createdAt"`,
      [
        input.title,
        input.wagePercent,
        input.profitPercent,
        input.taxPercent,
        input.fixedServiceFee
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
