import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";
import crypto from "node:crypto";
import { supabaseService } from "@/lib/supabaseServer";
import { addAdminProductToCache, getAdminProductsCache, loadAdminProductsFromDb, patchAdminProductCache, removeAdminProductFromCache } from "@/lib/adminProductsData";

const REST_WRITE_TIMEOUT_MS = 8_000;
const REST_WRITE_RETRIES = 3;

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function restWrite(path: string, init: RequestInit) {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown = null;

  for (let attempt = 0; attempt < REST_WRITE_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REST_WRITE_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          "content-type": "application/json",
          prefer: "return=minimal",
          ...(init.headers || {}),
        },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Supabase REST ${response.status}`);
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt === REST_WRITE_RETRIES - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function GET(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  let mapped;
  let stale = false;
  try {
    mapped = await loadAdminProductsFromDb();
  } catch (error) {
    const cached = getAdminProductsCache();
    if (!cached) return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    mapped = cached.data;
    stale = true;
  }

  return NextResponse.json({ data: mapped, stale });
}

const VariantSchema = z.object({
  storageGb: z.number().int().positive(),
  simType: z.enum(["esim", "sim_esim", "sim"]),
  colors: z.array(z.string().min(3)).default([]),
  price: z.number().int().nonnegative(),
  sku: z.string().nullable().optional().default(null),
  inStock: z.boolean().default(true),
});

const CreateSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional().default(""),
  categoryId: z.string().min(1),
  basePrice: z.number().int().nonnegative().default(0),
  imageUrls: z.array(z.string()).default([]),
  cardColors: z.array(z.string().trim().min(1)).max(64).default([]),
  cardImageScale: z.number().min(1).max(3).default(1),
  cardImagePositionX: z.number().int().min(0).max(100).default(50),
  cardImagePositionY: z.number().int().min(0).max(100).default(50),
  characteristicsText: z.string().optional().default(""),
  isActive: z.boolean().default(true),
  variants: z.array(VariantSchema).default([]),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = CreateSchema.parse(await req.json());
  const id = crypto.randomUUID();
  const sb = supabaseService();
  const { error: prodErr } = await sb.from("products").insert({
    id,
    slug: payload.slug,
    title: payload.title,
    subtitle: payload.subtitle,
    category_id: payload.categoryId,
    base_price: payload.basePrice,
    image_urls: payload.imageUrls,
    card_colors: payload.cardColors,
    characteristics_text: payload.characteristicsText,
    is_active: payload.isActive,
  });
  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

  const cachedVariants = payload.variants.map((v) => ({
      id: crypto.randomUUID(),
      product_id: id,
      storage_gb: v.storageGb,
      sim_type: v.simType,
      colors: v.colors,
      price: v.price,
      sku: v.sku,
      in_stock: v.inStock,
    }));
  if (cachedVariants.length) {
    const { error: vErr } = await sb.from("product_variants").insert(cachedVariants);
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  }

  addAdminProductToCache({
    id,
    slug: payload.slug,
    title: payload.title,
    subtitle: payload.subtitle,
    categoryId: payload.categoryId,
    basePrice: payload.basePrice,
    imageUrls: payload.imageUrls,
    cardColors: payload.cardColors,
    cardImageScale: payload.cardImageScale,
    cardImagePositionX: payload.cardImagePositionX,
    cardImagePositionY: payload.cardImagePositionY,
    characteristicsText: payload.characteristicsText,
    isActive: payload.isActive,
    variants: cachedVariants.map((v) => ({
      id: v.id,
      productId: id,
      storageGb: v.storage_gb,
      simType: v.sim_type,
      colors: v.colors,
      imageUrl: null,
      price: v.price,
      sku: v.sku,
      inStock: v.in_stock,
    })),
  });
  return NextResponse.json({ data: { id } }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  basePrice: z.number().int().nonnegative().optional(),
  imageUrls: z.array(z.string()).optional(),
  cardColors: z.array(z.string().trim().min(1)).max(64).optional(),
  cardImageScale: z.number().min(1).max(3).optional(),
  cardImagePositionX: z.number().int().min(0).max(100).optional(),
  cardImagePositionY: z.number().int().min(0).max(100).optional(),
  characteristicsText: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = PatchSchema.parse(await req.json());
  const patch: Record<string, unknown> = {};
  if (payload.slug !== undefined) patch.slug = payload.slug;
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.subtitle !== undefined) patch.subtitle = payload.subtitle;
  if (payload.categoryId !== undefined) patch.category_id = payload.categoryId;
  if (payload.basePrice !== undefined) patch.base_price = payload.basePrice;
  if (payload.imageUrls !== undefined) patch.image_urls = payload.imageUrls;
  if (payload.cardColors !== undefined) patch.card_colors = payload.cardColors;
  if (payload.cardImageScale !== undefined) patch.card_image_scale = payload.cardImageScale;
  if (payload.cardImagePositionX !== undefined) patch.card_image_position_x = payload.cardImagePositionX;
  if (payload.cardImagePositionY !== undefined) patch.card_image_position_y = payload.cardImagePositionY;
  if (payload.characteristicsText !== undefined) patch.characteristics_text = payload.characteristicsText;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  try {
    await restWrite(`products?id=eq.${encodeURIComponent(payload.id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  patchAdminProductCache(payload.id, {
    ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.subtitle !== undefined ? { subtitle: payload.subtitle } : {}),
    ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
    ...(payload.basePrice !== undefined ? { basePrice: payload.basePrice } : {}),
    ...(payload.imageUrls !== undefined ? { imageUrls: payload.imageUrls } : {}),
    ...(payload.cardColors !== undefined ? { cardColors: payload.cardColors } : {}),
    ...(payload.cardImageScale !== undefined ? { cardImageScale: payload.cardImageScale } : {}),
    ...(payload.cardImagePositionX !== undefined ? { cardImagePositionX: payload.cardImagePositionX } : {}),
    ...(payload.cardImagePositionY !== undefined ? { cardImagePositionY: payload.cardImagePositionY } : {}),
    ...(payload.characteristicsText !== undefined ? { characteristicsText: payload.characteristicsText } : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  try {
    await restWrite(`products?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  removeAdminProductFromCache(id);
  return NextResponse.json({ ok: true });
}

