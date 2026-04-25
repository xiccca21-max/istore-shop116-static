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

  // Admin wants only one iPhone category; normalize all "appleiphone..." categories to "iphone".
  const { data: iphoneCat, error: iphoneErr } = await sb.from("categories").select("id,slug,title").eq("slug", "iphone").maybeSingle();
  if (iphoneErr) return NextResponse.json({ error: iphoneErr.message }, { status: 500 });

  const { data, error } = await sb
    .from("products")
    .select(
      `
      id,slug,title,subtitle,category_id,base_price,image_urls,is_active,
      categories:category_id ( slug,title ),
      product_variants ( id, storage_gb, sim_type, colors, price, sku, in_stock )
    `,
    )
    .order("base_price", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    category_id: string;
    base_price: number;
    image_urls: string[] | null;
    is_active: boolean;
    categories: { slug: string; title: string } | null;
    product_variants: Array<{
      id: string;
      storage_gb: number;
      sim_type: string;
      colors: string[] | null;
      price: number;
      sku: string | null;
      in_stock: boolean;
    }> | null;
  }>;
  const mapped = rows.map((p) => {
    const isIphoneFamily = !!p.categories?.slug && (p.categories.slug === "iphone" || p.categories.slug.startsWith("appleiphone"));
    const normalizedCategoryId = isIphoneFamily && iphoneCat?.id ? iphoneCat.id : p.category_id;
    const normalizedCategorySlug = isIphoneFamily ? "iphone" : p.categories?.slug;
    const normalizedCategoryTitle = isIphoneFamily ? (iphoneCat?.title || "iPhone") : p.categories?.title;
    return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    categoryId: normalizedCategoryId,
    basePrice: p.base_price,
    imageUrls: p.image_urls || [],
    isActive: p.is_active,
    categorySlug: normalizedCategorySlug,
    categoryTitle: normalizedCategoryTitle,
    variants: (p.product_variants || []).map((v) => ({
      id: v.id,
      productId: p.id,
      storageGb: v.storage_gb,
      simType: v.sim_type,
      colors: v.colors || [],
      price: v.price,
      sku: v.sku,
      inStock: v.in_stock,
    })),
    };
  });

  return NextResponse.json({ data: mapped });
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
    is_active: payload.isActive,
  });
  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

  if (payload.variants.length) {
    const variants = payload.variants.map((v) => ({
      id: crypto.randomUUID(),
      product_id: id,
      storage_gb: v.storageGb,
      sim_type: v.simType,
      colors: v.colors,
      price: v.price,
      sku: v.sku,
      in_stock: v.inStock,
    }));
    const { error: vErr } = await sb.from("product_variants").insert(variants);
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  }

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
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  const sb = supabaseService();
  const { error } = await sb.from("products").update(patch).eq("id", payload.id);
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
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

