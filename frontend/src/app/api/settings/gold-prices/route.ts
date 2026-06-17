import { NextResponse } from "next/server";

export async function PUT() {
  return NextResponse.json({
    persisted: false,
    message: "تنظیمات قیمت در نسخه Vercel به صورت محلی استفاده می‌شود."
  });
}
