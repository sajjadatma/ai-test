import { NextResponse } from "next/server";

const OUNCE_TO_GRAM = 31.1034768;

const roundMoney = (value: number) => Math.round(value);

export async function GET() {
  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch("https://data-asg.goldprice.org/dbXRates/USD", {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }),
      fetch("https://open.er-api.com/v6/latest/USD", {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      })
    ]);

    if (!goldResponse.ok || !fxResponse.ok) {
      return NextResponse.json(
        { message: "دریافت نرخ‌های لحظه‌ای از سرویس‌های بیرونی ناموفق بود." },
        { status: 502 }
      );
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
    const eurPerUsd = fxData.rates?.EUR;
    const aedPerUsd = fxData.rates?.AED;

    if (
      !xauPrice ||
      !usdToRial ||
      !eurPerUsd ||
      !aedPerUsd ||
      fxData.result !== "success"
    ) {
      return NextResponse.json(
        { message: "پاسخ API نرخ‌ها ناقص یا نامعتبر بود." },
        { status: 502 }
      );
    }

    const usdExchangeRate = usdToRial / 10;
    const domestic18kPrice = roundMoney(
      ((xauPrice * usdExchangeRate) / OUNCE_TO_GRAM) * (18 / 24)
    );

    return NextResponse.json({
      globalGoldPrice: xauPrice,
      domestic18kPrice,
      usdExchangeRate,
      currencyRates: {
        TOMAN: 1,
        RIAL: 0.1,
        USD: usdExchangeRate,
        EUR: usdExchangeRate / eurPerUsd,
        AED: usdExchangeRate / aedPerUsd
      },
      source: {
        gold: "GoldPrice.org public JSON endpoint",
        fx: "ExchangeRate-API Open Access"
      },
      updatedAt:
        fxData.time_last_update_utc ??
        (goldData.ts ? new Date(goldData.ts).toISOString() : new Date().toISOString())
    });
  } catch {
    return NextResponse.json(
      { message: "در ارتباط با سرویس نرخ طلا یا ارز خطا رخ داد." },
      { status: 502 }
    );
  }
}
