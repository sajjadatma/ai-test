import { Router } from "express";

export const marketRatesRouter = Router();

const OUNCE_TO_GRAM = 31.1034768;
const roundMoney = (value: number) => Math.round(value);

marketRatesRouter.get("/", async (_req, res, next) => {
  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch("https://data-asg.goldprice.org/dbXRates/USD", {
        headers: { Accept: "application/json" }
      }),
      fetch("https://open.er-api.com/v6/latest/USD", {
        headers: { Accept: "application/json" }
      })
    ]);

    if (!goldResponse.ok || !fxResponse.ok) {
      res.status(502).json({
        message: "دریافت نرخ‌های لحظه‌ای از سرویس‌های بیرونی ناموفق بود."
      });
      return;
    }

    const goldData = (await goldResponse.json()) as {
      ts?: number;
      items?: Array<{ xauPrice?: number }>;
    };
    const fxData = (await fxResponse.json()) as {
      result?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
    };

    const xauPrice = goldData.items?.[0]?.xauPrice;
    const usdToRial = fxData.rates?.IRR;
    if (!xauPrice || !usdToRial || fxData.result !== "success") {
      res.status(502).json({
        message: "پاسخ API نرخ‌ها ناقص یا نامعتبر بود."
      });
      return;
    }

    const usdExchangeRate = usdToRial / 10;
    const domestic18kPrice = roundMoney(
      ((xauPrice * usdExchangeRate) / OUNCE_TO_GRAM) * (18 / 24)
    );

    res.json({
      globalGoldPrice: xauPrice,
      domestic18kPrice,
      usdExchangeRate,
      currencyRates: {
        TOMAN: 1,
        RIAL: 0.1
      },
      source: {
        gold: "GoldPrice.org",
        fx: "ExchangeRate-API"
      },
      updatedAt:
        fxData.time_last_update_utc ??
        (goldData.ts ? new Date(goldData.ts).toISOString() : new Date().toISOString())
    });
  } catch (error) {
    next(error);
  }
});
