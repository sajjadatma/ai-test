import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";

export const customersRouter = Router();

const customerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(7)
});

customersRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT id, full_name AS \"fullName\", phone, created_at AS \"createdAt\" FROM customers ORDER BY created_at DESC LIMIT 100"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const input = customerSchema.parse(req.body);
    const result = await query(
      "INSERT INTO customers (full_name, phone) VALUES ($1, $2) RETURNING id, full_name AS \"fullName\", phone, created_at AS \"createdAt\"",
      [input.fullName, input.phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
