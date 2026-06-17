import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";

export const settingsRouter = Router();

const settingsSchema = z.object({
  globalGoldPrice: z.number().min(0),
  domestic18kPrice: z.number().positive(),
  usdExchangeRate: z.number().min(0),
  selectedCurrency: z.string().min(1),
  currencies: z
    .array(z.object({ code: z.string(), rateToToman: z.number().min(0) }))
    .default([]),
  coins: z.array(z.object({ code: z.string(), priceToman: z.number().min(0) })).default([])
});

settingsRouter.get("/", async (_req, res, next) => {
  try {
    const [gold, currencies, coins, karats, units] = await Promise.all([
      query(
        `SELECT id, global_gold_price AS "globalGoldPrice", domestic_18k_price AS "domestic18kPrice",
                usd_exchange_rate AS "usdExchangeRate", selected_currency AS "selectedCurrency",
                updated_at AS "updatedAt"
         FROM gold_price_sources ORDER BY updated_at DESC LIMIT 1`
      ),
      query(
        `SELECT code, title_fa AS "titleFa", rate_to_toman AS "rateToToman", updated_at AS "updatedAt"
         FROM currencies ORDER BY code`
      ),
      query(
        `SELECT code, title_fa AS "titleFa", price_toman AS "priceToman", updated_at AS "updatedAt"
         FROM coin_types ORDER BY code`
      ),
      query(`SELECT karat, title_fa AS "titleFa" FROM karat_options ORDER BY karat DESC`),
      query(`SELECT code, title_fa AS "titleFa", gram_factor AS "gramFactor" FROM unit_options`)
    ]);

    res.json({
      goldPrice: gold.rows[0] ?? null,
      currencies: currencies.rows,
      coins: coins.rows,
      karats: karats.rows,
      units: units.rows
    });
  } catch (error) {
    next(error);
  }
});

settingsRouter.put("/gold-prices", async (req, res, next) => {
  try {
    const input = settingsSchema.parse(req.body);

    await Promise.all([
      ...input.currencies.map((currency) =>
        query(
          "UPDATE currencies SET rate_to_toman = $1, updated_at = NOW() WHERE code = $2",
          [currency.rateToToman, currency.code]
        )
      ),
      ...input.coins.map((coin) =>
        query("UPDATE coin_types SET price_toman = $1, updated_at = NOW() WHERE code = $2", [
          coin.priceToman,
          coin.code
        ])
      )
    ]);

    const result = await query(
      `INSERT INTO gold_price_sources
       (global_gold_price, domestic_18k_price, usd_exchange_rate, selected_currency, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, global_gold_price AS "globalGoldPrice", domestic_18k_price AS "domestic18kPrice",
                 usd_exchange_rate AS "usdExchangeRate", selected_currency AS "selectedCurrency",
                 updated_at AS "updatedAt"`,
      [
        input.globalGoldPrice,
        input.domestic18kPrice,
        input.usdExchangeRate,
        input.selectedCurrency
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
