import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculatePrice } from "../src/pricing";
import type { Competitor, PriceResult, Product } from "../src/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    sku: "SKU-1",
    name: "Тестовый товар",
    myPrice: 100_000,
    minPrice: 90_000,
    maxPrice: 120_000,
    step: 10,
    competitors: [],
    ...overrides,
  };
}

const seller = (price: number, inStock = true): Competitor => ({ seller: `S${price}`, price, inStock });

describe("calculatePrice", () => {
  it("совпадает с data/expected.json на data/products.json", () => {
    const products: Product[] = JSON.parse(readFileSync("data/products.json", "utf8"));
    const expected: PriceResult[] = JSON.parse(readFileSync("data/expected.json", "utf8"));
    expect(products.map(calculatePrice)).toEqual(expected);
  });

  it("NO_COMPETITORS при пустом списке", () => {
    expect(calculatePrice(product())).toMatchObject({ newPrice: 120_000, reason: "NO_COMPETITORS" });
  });

  it("NO_COMPETITORS, если все конкуренты не в наличии", () => {
    const r = calculatePrice(product({ competitors: [seller(95_000, false), seller(91_000, false)] }));
    expect(r).toMatchObject({ newPrice: 120_000, reason: "NO_COMPETITORS" });
  });

  it("игнорирует более дешёвых конкурентов без наличия", () => {
    const r = calculatePrice(product({ competitors: [seller(80_000, false), seller(100_000)] }));
    expect(r).toMatchObject({ newPrice: 99_990, reason: "UNDERCUT" });
  });

  it("берёт минимальную цену среди нескольких, в т.ч. одинаковых", () => {
    const r = calculatePrice(product({ competitors: [seller(110_000), seller(105_000), seller(105_000)] }));
    expect(r).toMatchObject({ newPrice: 104_990, reason: "UNDERCUT" });
  });

  it("AT_MIN, когда кандидат ниже minPrice", () => {
    const r = calculatePrice(product({ competitors: [seller(85_000)] }));
    expect(r).toMatchObject({ newPrice: 90_000, reason: "AT_MIN" });
  });

  it("AT_MAX, когда кандидат выше maxPrice", () => {
    const r = calculatePrice(product({ competitors: [seller(200_000)] }));
    expect(r).toMatchObject({ newPrice: 120_000, reason: "AT_MAX" });
  });

  it("границы включительно: кандидат = minPrice и = maxPrice дают UNDERCUT", () => {
    expect(calculatePrice(product({ competitors: [seller(90_010)] }))).toMatchObject({ newPrice: 90_000, reason: "UNDERCUT" });
    expect(calculatePrice(product({ competitors: [seller(120_010)] }))).toMatchObject({ newPrice: 120_000, reason: "UNDERCUT" });
  });

  it("step = 0: встаём ровно на цену конкурента", () => {
    const r = calculatePrice(product({ step: 0, competitors: [seller(100_000)] }));
    expect(r).toMatchObject({ newPrice: 100_000, reason: "UNDERCUT" });
  });

  it("дробный шаг и цена: округление вниз", () => {
    const r = calculatePrice(product({ step: 0.5, competitors: [seller(99_999.9)] }));
    expect(r).toMatchObject({ newPrice: 99_999, reason: "UNDERCUT" });
  });

  it("не теряет тенге из-за погрешности float (131072.8 - 0.8 в JS = 131071.99999999999)", () => {
    const r = calculatePrice(product({ minPrice: 100_000, maxPrice: 140_000, step: 0.8, competitors: [seller(131_072.8)] }));
    expect(r).toMatchObject({ newPrice: 131_072, reason: "UNDERCUT" });
  });

  it("oldPrice = myPrice, и myPrice не влияет на расчёт", () => {
    const a = calculatePrice(product({ myPrice: 1, competitors: [seller(100_000)] }));
    const b = calculatePrice(product({ myPrice: 999_999, competitors: [seller(100_000)] }));
    expect(a.oldPrice).toBe(1);
    expect(b.oldPrice).toBe(999_999);
    expect(a.newPrice).toBe(b.newPrice);
  });

  it("не мутирует входной объект", () => {
    const p = product({ competitors: [seller(100_000), seller(90_000, false)] });
    const snapshot = structuredClone(p);
    calculatePrice(p);
    expect(p).toEqual(snapshot);
  });
});
