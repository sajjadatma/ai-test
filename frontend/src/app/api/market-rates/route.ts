import { NextResponse } from "next/server";

function parseTgjuPrice(html: string) {
  const patterns = [/نرخ فعلی\s*[:：]+\s*([\d,]+)/u, /نرخ فعلی\s+([\d,]+)/u];

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

export async function GET() {
  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch("https://www.tgju.org/profile/geram18", {
        cache: "no-store",
        headers: { Accept: "text/html" }
      }),
      fetch("https://www.tgju.org/profile/price_dollar_rl", {
        cache: "no-store",
        headers: { Accept: "text/html" }
      })
    ]);

    if (!goldResponse.ok || !fxResponse.ok) {
      return NextResponse.json(
        { message: "دریافت نرخ از منبع ایرانی ناموفق بود." },
        { status: 502 }
      );
    }

    const [goldHtml, fxHtml] = await Promise.all([
      goldResponse.text(),
      fxResponse.text()
    ]);

    const domestic18kPriceRial = parseTgjuPrice(goldHtml);
    const usdExchangeRateRial = parseTgjuPrice(fxHtml);

    if (!domestic18kPriceRial || !usdExchangeRateRial) {
      return NextResponse.json(
        { message: "خواندن نرخ‌ها از TGJU ناموفق بود." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      globalGoldPrice: null,
      domestic18kPrice: Math.round(domestic18kPriceRial / 10),
      usdExchangeRate: Math.round(usdExchangeRateRial / 10),
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
  } catch {
    return NextResponse.json(
      { message: "در ارتباط با منبع ایرانی قیمت خطا رخ داد." },
      { status: 502 }
    );
  }
}
