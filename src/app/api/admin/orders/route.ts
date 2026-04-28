import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";

function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function ordersRest(path: string, init: RequestInit = {}) {
  const baseUrl = mustEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/orders${path}`, {
        ...init,
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          ...(init.headers || {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  let data: unknown[] = [];
  try {
    const text = await ordersRest(
      "?select=id,name,phone,comment,total,status,created_at,order_items(id,product_variant_id,qty,price,product_variants:product_variant_id(storage_gb,sim_type))&order=created_at.desc",
    );
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  const rows = (data || []) as unknown as Array<{
    id: string;
    name: string;
    phone: string;
    comment: string;
    total: number;
    status: "new" | "handled";
    created_at: string;
    order_items: Array<{
      id: string;
      product_variant_id: string;
      qty: number;
      price: number;
      product_variants: { storage_gb: number; sim_type: string } | null;
    }> | null;
  }>;
  const mapped = rows.map((o) => ({
    id: o.id,
    name: o.name,
    phone: o.phone,
    comment: o.comment,
    total: o.total,
    status: o.status,
    createdAt: o.created_at,
    items: (o.order_items || []).map((it) => ({
      id: it.id,
      productVariantId: it.product_variant_id,
      qty: it.qty,
      price: it.price,
      storageGb: it.product_variants?.storage_gb ?? 0,
      simType: it.product_variants?.sim_type ?? "",
    })),
  }));
  return NextResponse.json({ data: mapped });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "handled"]),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = PatchSchema.parse(await req.json());
  try {
    await ordersRest(`?id=eq.${encodeURIComponent(payload.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ status: payload.status }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

