import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";
import crypto from "node:crypto";
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
    .from("raffle_prizes")
    .select("id,title,product_id,sort_order,is_active,created_at,products:product_id(id,slug,title)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as unknown as Array<{
    id: string;
    title: string;
    product_id: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    products: { id: string; slug: string; title: string } | null;
  }>;

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      productId: r.product_id,
      sortOrder: r.sort_order,
      isActive: r.is_active,
      product: r.products ? { id: r.products.id, slug: r.products.slug, title: r.products.title } : null,
    })),
  });
}

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  productId: z.string().uuid().nullable().optional().default(null),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const payload = CreateSchema.parse(await req.json());
  const id = crypto.randomUUID();
  const sb = supabaseService();
  const { error } = await sb.from("raffle_prizes").insert({
    id,
    title: payload.title,
    product_id: payload.productId,
    sort_order: payload.sortOrder,
    is_active: payload.isActive,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  productId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const payload = PatchSchema.parse(await req.json());
  const patch: Record<string, unknown> = {};
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.productId !== undefined) patch.product_id = payload.productId;
  if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  const sb = supabaseService();
  const { error } = await sb.from("raffle_prizes").update(patch).eq("id", payload.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const sb = supabaseService();
  const { error } = await sb.from("raffle_prizes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

