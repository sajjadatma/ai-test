import { Router } from "express";

export const marketRatesRouter = Router();

function parseTgjuPrice(html: string) {
  const patterns = [
    /نرخ فعلی\s*[:：]+\s*([\d,]+)/u,
    /نرخ فعلی\s+([\d,]+)/u
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const numeric = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }
  }

  return null;
}

marketRatesRouter.get("/", async (_req, res, next) => {
  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch("https://www.tgju.org/profile/geram18", {
        headers: { Accept: "text/html" }
      }),
      fetch("https://www.tgju.org/profile/price_dollar_rl", {
        headers: { Accept: "text/html" }
      })
    ]);

    if (!goldResponse.ok || !fxResponse.ok) {
      res.status(502).json({
        message: "دریافت نرخ از منبع ایرانی ناموفق بود."
      });
      return;
    }

    const [goldHtml, fxHtml] = await Promise.all([
      goldResponse.text(),
      fxResponse.text()
    ]);

    const domestic18kPriceRial = parseTgjuPrice(goldHtml);
    const usdExchangeRateRial = parseTgjuPrice(fxHtml);

    if (!domestic18kPriceRial || !usdExchangeRateRial) {
      res.status(502).json({
        message: "خواندن نرخ‌ها از TGJU ناموفق بود."
      });
      return;
    }

    const domestic18kPrice = Math.round(domestic18kPriceRial / 10);
    const usdExchangeRate = Math.round(usdExchangeRateRial / 10);

    res.json({
      globalGoldPrice: null,
      domestic18kPrice,
      usdExchangeRate,
      currencyRates: {
        TOMAN: 1,
        RIAL: 0.1
      },
      source: {
        gold: "TGJU",
        fx: "TGJU"
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
