import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { invalidateAdminProductsCache, loadAdminProductsFromDb } from "@/lib/adminProductsData";
import { buildPriceLookup, normalizePriceLabel, parsePriceCell } from "@/lib/bulkPriceLabels";
import { supabaseService } from "@/lib/supabaseServer";

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

function matrixFromSheet(buffer: Buffer): unknown[][] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
}

/** Строка [код?, название, цена] или [название, цена]; если код в Excel обрезан — можно править только цену по колонкам B/C. */
function rowTriple(row: unknown[]): { code?: string; label: string; priceRaw: unknown } | null {
  const cells = row.map((c) => (c === null || c === undefined ? "" : c));
  const str0 = String(cells[0] ?? "").trim();

  if (/^[pv]:[0-9a-f-]{36}$/i.test(str0)) {
    const label = String(cells[1] ?? "").trim();
    if (!label) return null;
    return { code: str0, label, priceRaw: cells[2] };
  }

  if (cells.length >= 3 && !str0) {
    const label = String(cells[1] ?? "").trim();
    if (!label) return null;
    return { label, priceRaw: cells[2] };
  }

  const label = str0;
  if (!label) return null;
  const priceRaw = cells.length >= 3 ? cells[2] : cells[1];
  return { label, priceRaw };
}

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const ab = await file.arrayBuffer();
  const buffer = Buffer.from(ab);
  if (buffer.length < 64) {
    return NextResponse.json({ error: "file_too_small" }, { status: 400 });
  }

  const matrix = matrixFromSheet(buffer);
  if (!matrix.length) {
    return NextResponse.json({ error: "empty_sheet" }, { status: 400 });
  }

  let startRow = 0;
  const head0 = String(matrix[0]?.[0] ?? "").toLowerCase();
  if (head0.includes("код") || head0.includes("наимен")) startRow = 1;

  const products = await loadAdminProductsFromDb();
  const { byCode, byLabel } = buildPriceLookup(products);

  const sb = supabaseService();
  const errors: { row: number; message: string }[] = [];
  const unmatched: { row: number; detail: string }[] = [];
  let updated = 0;

  for (let i = startRow; i < matrix.length; i += 1) {
    const row = matrix[i] as unknown[];
    if (!Array.isArray(row)) continue;
    const parsed = rowTriple(row);
    if (!parsed || !parsed.label) continue;

    const price = parsePriceCell(parsed.priceRaw);
    if (price === null) {
      errors.push({ row: i + 1, message: `Не удалось разобрать цену: ${String(parsed.priceRaw)}` });
      continue;
    }
    if (price < 0) {
      errors.push({ row: i + 1, message: "Цена не может быть отрицательной" });
      continue;
    }

    let target: { kind: "product" | "variant"; id: string } | undefined;

    if (parsed.code) {
      target = byCode.get(parsed.code);
      if (!target) {
        unmatched.push({ row: i + 1, detail: `Неизвестный код «${parsed.code}». Скачайте шаблон заново.` });
        continue;
      }
    } else {
      const key = normalizePriceLabel(parsed.label);
      target = byLabel.get(key);
      if (!target) {
        unmatched.push({
          row: i + 1,
          detail: `Строка не сопоставлена с каталогом: «${parsed.label.slice(0, 80)}${parsed.label.length > 80 ? "…" : ""}». Проверьте текст или добавьте колонку «Код строки» из шаблона.`,
        });
        continue;
      }
    }

    if (target.kind === "variant") {
      const { error } = await sb.from("product_variants").update({ price }).eq("id", target.id);
      if (error) errors.push({ row: i + 1, message: error.message });
      else updated += 1;
    } else {
      const { error } = await sb.from("products").update({ base_price: price }).eq("id", target.id);
      if (error) errors.push({ row: i + 1, message: error.message });
      else updated += 1;
    }
  }

  invalidateAdminProductsCache();

  return NextResponse.json({
    ok: true,
    updated,
    errors,
    unmatched,
    hint:
      "Колонка «Код строки» из скачанного шаблона гарантирует точное сопоставление. Колонку «Наименование» можно не менять.",
  });
}
