import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import request from "supertest";
import { createApp } from "../server/app";

const app = createApp();
const products = JSON.parse(readFileSync("data/products.json", "utf8"));
const expected = JSON.parse(readFileSync("data/expected.json", "utf8"));

describe("POST /reprice", () => {
  it("возвращает результаты в том же порядке", async () => {
    const res = await request(app).post("/reprice").send(products);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expected);
  });

  it("пустой массив даёт пустой ответ", async () => {
    const res = await request(app).post("/reprice").send([]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("400, если тело не массив", async () => {
    const res = await request(app).post("/reprice").send({ sku: "X" });
    expect(res.status).toBe(400);
  });

  it("400 на некорректный товар", async () => {
    const res = await request(app).post("/reprice").send([{ sku: "X", name: "Y", myPrice: "много" }]);
    expect(res.status).toBe(400);
  });

  it("400 на невалидный JSON", async () => {
    const res = await request(app).post("/reprice").set("Content-Type", "application/json").send("[{");
    expect(res.status).toBe(400);
  });
});
