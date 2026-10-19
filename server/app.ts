import express from "express";
import { calculatePrice } from "../src/pricing";
import type { Product } from "../src/types";

function isCompetitor(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return typeof c.seller === "string" && Number.isFinite(c.price) && typeof c.inStock === "boolean";
}

// Проверяем форму товара, чтобы calculatePrice не упал на мусорных данных.
export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  const numbers = [p.myPrice, p.minPrice, p.maxPrice, p.step];
  return (
    typeof p.sku === "string" &&
    typeof p.name === "string" &&
    numbers.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) &&
    (p.minPrice as number) <= (p.maxPrice as number) &&
    Array.isArray(p.competitors) &&
    p.competitors.every(isCompetitor)
  );
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/reprice", (req, res) => {
    const body: unknown = req.body;
    if (!Array.isArray(body)) {
      res.status(400).json({ error: "Тело запроса должно быть массивом товаров" });
      return;
    }
    const badIndex = body.findIndex((item) => !isProduct(item));
    if (badIndex !== -1) {
      res.status(400).json({ error: `Некорректный товар с индексом ${badIndex}` });
      return;
    }
    res.json(body.map(calculatePrice));
  });

  // Невалидный JSON: express.json() бросает ошибку, отвечаем 400 вместо 500.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status === 400 ? 400 : 500).json({ error: status === 400 ? "Невалидный JSON" : "Ошибка сервера" });
  });

  return app;
}
