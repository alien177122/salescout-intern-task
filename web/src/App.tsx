import { useEffect, useState } from "react";
import products from "../../data/products.json";
import type { PriceResult, Product, Reason } from "../../src/types";

const REASON_LABEL: Record<Reason, string> = {
  UNDERCUT: "Дешевле конкурента",
  AT_MIN: "Упёрлись в минимум",
  AT_MAX: "Упёрлись в максимум",
  NO_COMPETITORS: "Нет конкурентов в наличии",
};

const tenge = (value: number) => `${value.toLocaleString("ru-RU")} ₸`;

type Row = PriceResult & { name: string };

export function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = products as Product[];
    fetch("/reprice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
        return res.json() as Promise<PriceResult[]>;
      })
      .then((results) => setRows(results.map((r, i) => ({ ...r, name: list[i].name }))))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Неизвестная ошибка"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <h1>Прайс-бот: было / стало</h1>
      {loading && <p>Загрузка…</p>}
      {error && <p className="error">Не удалось получить цены: {error}</p>}
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Название</th>
              <th className="num">Было</th>
              <th className="num">Стало</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sku}>
                <td className="sku">{r.sku}</td>
                <td>{r.name}</td>
                <td className="num">{tenge(r.oldPrice)}</td>
                <td className={`num ${r.newPrice < r.oldPrice ? "down" : r.newPrice > r.oldPrice ? "up" : ""}`}>
                  {tenge(r.newPrice)}
                </td>
                <td>{REASON_LABEL[r.reason]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
