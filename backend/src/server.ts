import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { customersRouter } from "./routes/customers.js";
import { productsRouter } from "./routes/products.js";
import { invoicesRouter } from "./routes/invoices.js";
import { settingsRouter } from "./routes/settings.js";
import { feePresetsRouter } from "./routes/feePresets.js";
import { marketRatesRouter } from "./routes/marketRates.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/fee-presets", feePresetsRouter);
app.use("/api/market-rates", marketRatesRouter);
app.use(errorHandler);

app.listen(port, host, () => {
  console.log(`Gold shop API listening on http://${host}:${port}`);
});
