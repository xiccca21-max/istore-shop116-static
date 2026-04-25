import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseServer";

const CartItemSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().min(1),
  subtitle: z.string().optional().default(""),
  imageUrl: z.string().nullable().optional(),
  price: z.number().int().nonnegative(),
  qty: z.number().int().positive(),
});

const OrderSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  comment: z.string().optional().default(""),
  items: z.array(CartItemSchema).min(1),
});

export async function POST(req: Request) {
  const payload = OrderSchema.parse(await req.json());

  const variantIds = [...new Set(payload.items.map((it) => it.variantId))];
  const sb = supabaseService();
  const { data: variants, error: vErr } = await sb
    .from("product_variants")
    .select("id, product_id, price")
    .in("id", variantIds);

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  if (!variants || variants.length !== variantIds.length) {
    return NextResponse.json({ error: "invalid_variants" }, { status: 400 });
  }

  const productIds = [...new Set(variants.map((v) => v.product_id))];
  const { data: products, error: pErr } = await sb.from("products").select("id, is_active").in("id", productIds);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  const activeByProduct = new Map((products || []).map((p) => [p.id, p.is_active]));

  const byId = new Map(
    variants.map((v) => [
      v.id,
      {
        productId: v.product_id,
        price: v.price,
        isActive: activeByProduct.get(v.product_id) === true,
      },
    ]),
  );

  for (const it of payload.items) {
    const row = byId.get(it.variantId);
    if (!row) return NextResponse.json({ error: "invalid_variants" }, { status: 400 });
    if (row.productId !== it.productId) return NextResponse.json({ error: "variant_product_mismatch" }, { status: 400 });
    if (!row.isActive) return NextResponse.json({ error: "product_inactive" }, { status: 400 });
  }

  const normalizedItems = payload.items.map((it) => {
    const row = byId.get(it.variantId)!;
    return { ...it, price: row.price };
  });

  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const total = normalizedItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  const { error: orderErr } = await sb.from("orders").insert({
    id: orderId,
    name: payload.name,
    phone: payload.phone,
    comment: payload.comment,
    total,
    status: "new",
    created_at: now,
  });
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  const items = normalizedItems.map((it) => ({
    id: crypto.randomUUID(),
    order_id: orderId,
    product_variant_id: it.variantId,
    qty: it.qty,
    price: it.price,
  }));
  const { error: itemsErr } = await sb.from("order_items").insert(items);
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({ data: { id: orderId } }, { status: 201 });
}
