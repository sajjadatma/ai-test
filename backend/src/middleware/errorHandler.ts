import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "اطلاعات وارد شده معتبر نیست.",
      issues: error.issues
    });
    return;
  }

  console.error(error);
  if (error?.code === "ECONNREFUSED") {
    res.status(503).json({
      message: "اتصال به پایگاه داده برقرار نیست. PostgreSQL را اجرا کنید و DATABASE_URL را بررسی کنید."
    });
    return;
  }

  res.status(500).json({ message: "خطای داخلی سرور رخ داد." });
};
