import type { AdminProduct } from "@/lib/adminProductsData";

/** Человекочитаемый тип SIM для строки Excel и сопоставления. */
export function simTypeLabelRu(simType: string): string {
  switch (simType) {
    case "esim":
      return "только eSIM";
    case "sim_esim":
      return "SIM + eSIM";
    case "sim":
      return "только SIM";
    default:
      return simType;
  }
}

/** Одна строка каталога: модель · память · SIM · цвет(а). */
export function buildVariantRowLabel(
  productTitle: string,
  v: { storageGb: number; simType: string; colors: string[] },
): string {
  const colors = (v.colors || []).map((c) => String(c).trim()).filter(Boolean);
  const colorPart = colors.length ? colors.join(", ") : "—";
  return `${productTitle} · ${v.storageGb} ГБ · ${simTypeLabelRu(v.simType)} · ${colorPart}`;
}

export function normalizePriceLabel(s: string): string {
  return String(s || "")
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[|｜]/g, "·")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type PriceRowExport = {
  code: string;
  label: string;
  price: number;
};

/** Строки для Excel: товар без вариантов — одна строка по base_price; с вариантами — по каждому варианту. */
export function buildPriceExportRows(products: AdminProduct[]): PriceRowExport[] {
  const sorted = [...products].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  const out: PriceRowExport[] = [];

  for (const p of sorted) {
    const variants = [...(p.variants || [])].sort((a, b) => {
      const s = a.storageGb - b.storageGb;
      if (s !== 0) return s;
      const sim = String(a.simType).localeCompare(String(b.simType));
      if (sim !== 0) return sim;
      return (a.colors || []).join().localeCompare((b.colors || []).join());
    });

    if (!variants.length) {
      out.push({
        code: `p:${p.id}`,
        label: p.title.trim(),
        price: Math.max(0, Math.round(Number(p.basePrice) || 0)),
      });
      continue;
    }

    for (const v of variants) {
      out.push({
        code: `v:${v.id}`,
        label: buildVariantRowLabel(p.title.trim(), v),
        price: Math.max(0, Math.round(Number(v.price) || 0)),
      });
    }
  }

  return out;
}

/** Индекс для сопоставления импорта: по коду и по нормализованной подписи. */
export function buildPriceLookup(products: AdminProduct[]): {
  byCode: Map<string, { kind: "product" | "variant"; id: string }>;
  byLabel: Map<string, { kind: "product" | "variant"; id: string }>;
} {
  const byCode = new Map<string, { kind: "product" | "variant"; id: string }>();
  const byLabel = new Map<string, { kind: "product" | "variant"; id: string }>();

  for (const p of products) {
    const variants = p.variants || [];
    if (!variants.length) {
      const code = `p:${p.id}`;
      const label = normalizePriceLabel(p.title.trim());
      byCode.set(code, { kind: "product", id: p.id });
      byLabel.set(label, { kind: "product", id: p.id });
      continue;
    }
    for (const v of variants) {
      const code = `v:${v.id}`;
      const label = normalizePriceLabel(buildVariantRowLabel(p.title.trim(), v));
      byCode.set(code, { kind: "variant", id: v.id });
      if (!byLabel.has(label)) byLabel.set(label, { kind: "variant", id: v.id });
    }
  }

  return { byCode, byLabel };
}

/** Парсинг цены из ячейки Excel (число, строка с пробелами и запятой). */
export function parsePriceCell(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const s = String(value).replace(/\u00a0/g, " ").trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}
