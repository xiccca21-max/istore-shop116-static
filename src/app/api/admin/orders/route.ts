import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseServer";

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const sb = supabaseService();
  const { data, error } = await sb
    .from("orders")
    .select(
      `
      id,name,phone,comment,total,status,created_at,
      order_items (
        id, product_variant_id, qty, price,
        product_variants:product_variant_id ( storage_gb, sim_type )
      )
    `,
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const sb = supabaseService();
  const { error } = await sb.from("orders").update({ status: payload.status }).eq("id", payload.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

