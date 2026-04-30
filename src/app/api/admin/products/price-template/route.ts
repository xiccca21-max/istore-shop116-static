import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { loadAdminProductsFromDb } from "@/lib/adminProductsData";
import { buildPriceExportRows } from "@/lib/bulkPriceLabels";

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await mustAuth(request);
  if (auth) return auth;

  const products = await loadAdminProductsFromDb();
  const rows = buildPriceExportRows(products);

  const aoa: (string | number)[][] = [
    ["Код строки", "Наименование", "Цена (₽)"],
    ...rows.map((r) => [r.code, r.label, r.price]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 40 }, { wch: 88 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Цены");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="istore-prices-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
