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
  consent: z.literal(true),
  items: z.array(CartItemSchema).min(1),
});

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

function formatPrice(value: number): string {
  return `${Number(value || 0).toLocaleString("ru-RU")} RUB`;
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendOrderToTelegram(params: {
  orderId: string;
  name: string;
  phone: string;
  comment: string;
  total: number;
  items: Array<{ title: string; subtitle: string; qty: number; price: number }>;
}) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  if (!token || !chatId) throw new Error("telegram_env_missing");

  const itemLines = params.items
    .map((it, idx) => {
      const subtitle = it.subtitle ? ` (${escapeHtml(it.subtitle)})` : "";
      return `${idx + 1}. ${escapeHtml(it.title)}${subtitle} x${it.qty} = <b>${escapeHtml(formatPrice(it.price * it.qty))}</b>`;
    })
    .join("\n");

  const commentLine = params.comment ? `\nКомментарий: ${escapeHtml(params.comment)}` : "";
  const text = [
    `<b>Новая заявка №${escapeHtml(params.orderId)}</b>`,
    "",
    itemLines || "Товары не переданы",
    "",
    `<b>Сумма:</b> ${escapeHtml(formatPrice(params.total))}`,
    "",
    "<b>Покупатель:</b>",
    `Имя: ${escapeHtml(params.name)}`,
    `Телефон: ${escapeHtml(params.phone)}`,
    commentLine,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`telegram_send_failed_${res.status}: ${body}`);
  }
}

async function sendOrderToTelegramStrict(params: Parameters<typeof sendOrderToTelegram>[0]) {
  const attempts = 2;
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    const timeoutMs = 7000;
    try {
      await Promise.race([
        sendOrderToTelegram(params),
        new Promise((_, reject) => setTimeout(() => reject(new Error("telegram_send_timeout")), timeoutMs)),
      ]);
      return;
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

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

  try {
    await sendOrderToTelegramStrict({
      orderId,
      name: payload.name,
      phone: payload.phone,
      comment: payload.comment,
      total,
      items: normalizedItems.map((it) => ({
        title: it.title,
        subtitle: it.subtitle,
        qty: it.qty,
        price: it.price,
      })),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("Telegram send failed:", reason);
    await sb.from("orders").update({ status: "telegram_failed" }).eq("id", orderId);
    return NextResponse.json({ error: "telegram_delivery_failed", reason, orderId }, { status: 502 });
  }

  return NextResponse.json({ data: { id: orderId } }, { status: 201 });
}
