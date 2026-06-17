import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";

export const productsRouter = Router();

const productSchema = z.object({
  type: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional().default("")
});

productsRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT id, type, sku, description, created_at AS \"createdAt\" FROM products ORDER BY created_at DESC LIMIT 100"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const input = productSchema.parse(req.body);
    const result = await query(
      `INSERT INTO products (type, sku, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (sku) DO UPDATE SET type = EXCLUDED.type, description = EXCLUDED.description
       RETURNING id, type, sku, description, created_at AS "createdAt"`,
      [input.type, input.sku, input.description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
