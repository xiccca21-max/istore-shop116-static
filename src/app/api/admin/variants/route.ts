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

const CreateSchema = z.object({
  productId: z.string().min(1),
  storageGb: z.number().int().positive(),
  simType: z.enum(["esim", "sim_esim", "sim"]),
  colors: z.array(z.string().min(3)).default([]),
  price: z.number().int().nonnegative(),
  sku: z.string().nullable().optional().default(null),
  inStock: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = CreateSchema.parse(await req.json());
  if (payload.colors.length > 1) return NextResponse.json({ error: "one_color_per_variant" }, { status: 400 });
  const id = crypto.randomUUID();
  const sb = supabaseService();
  const { error } = await sb.from("product_variants").insert({
    id,
    product_id: payload.productId,
    storage_gb: payload.storageGb,
    sim_type: payload.simType,
    colors: payload.colors,
    price: payload.price,
    sku: payload.sku,
    in_stock: payload.inStock,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  storageGb: z.number().int().positive().optional(),
  simType: z.enum(["esim", "sim_esim", "sim"]).optional(),
  colors: z.array(z.string().min(3)).optional(),
  price: z.number().int().nonnegative().optional(),
  sku: z.string().nullable().optional(),
  inStock: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = PatchSchema.parse(await req.json());
  if (payload.colors && payload.colors.length > 1) return NextResponse.json({ error: "one_color_per_variant" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (payload.storageGb !== undefined) patch.storage_gb = payload.storageGb;
  if (payload.simType !== undefined) patch.sim_type = payload.simType;
  if (payload.colors !== undefined) patch.colors = payload.colors;
  if (payload.price !== undefined) patch.price = payload.price;
  if (payload.sku !== undefined) patch.sku = payload.sku;
  if (payload.inStock !== undefined) patch.in_stock = payload.inStock;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  const sb = supabaseService();
  const { error } = await sb.from("product_variants").update(patch).eq("id", payload.id);
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
  const { error } = await sb.from("product_variants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

