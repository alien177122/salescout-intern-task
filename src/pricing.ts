import type { Product, PriceResult } from "./types";

// Погрешность для дробных цен/шагов: 131072.8 - 0.8 в JS даёт 131071.99999999999,
// а по смыслу это ровно 131072. Без поправки floor увёл бы цену на 1 тенге вниз.
const EPSILON = 1e-9;

function floorTenge(value: number): number {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) return rounded;
  return Math.floor(value);
}

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Правила расчёта цены».
 * Не меняйте сигнатуру и путь к файлу: решение проверяется автотестами.
 */
export function calculatePrice(product: Product): PriceResult {
  const { sku, myPrice, minPrice, maxPrice, step, competitors } = product;
  const base = { sku, oldPrice: myPrice };

  const inStockPrices = competitors.filter((c) => c.inStock).map((c) => c.price);
  if (inStockPrices.length === 0) {
    return { ...base, newPrice: maxPrice, reason: "NO_COMPETITORS" };
  }

  const best = Math.min(...inStockPrices);
  const candidate = floorTenge(best - step);

  if (candidate < minPrice) return { ...base, newPrice: minPrice, reason: "AT_MIN" };
  if (candidate > maxPrice) return { ...base, newPrice: maxPrice, reason: "AT_MAX" };
  return { ...base, newPrice: candidate, reason: "UNDERCUT" };
}
