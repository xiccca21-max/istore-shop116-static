import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseServer";

const CartItemSchema = z.object({
  variantId: z.string().min(1),
  productId: z.string().min(1),
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

  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const total = payload.items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const sb = supabaseService();
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

  const items = payload.items.map((it) => ({
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

