import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";

async function mustAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function featuredRest(path: string, init: RequestInit = {}) {
  const baseUrl = mustEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/homepage_featured_products${path}`, {
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

export async function GET(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  let data: unknown[] = [];
  try {
    const text = await featuredRest("?select=id,sort_order,is_active,product_id,products:product_id(id,slug,title,subtitle,base_price,image_urls)&order=sort_order.asc");
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }

  const rows = (data || []) as unknown as Array<{
    id: string;
    sort_order: number;
    is_active: boolean;
    products: { id: string; slug: string; title: string; subtitle: string; base_price: number; image_urls: string[] | null } | null;
  }>;

  return NextResponse.json({
    data: rows
      .filter((r) => r.products)
      .map((r) => ({
        id: r.id,
        sortOrder: r.sort_order,
        isActive: r.is_active ? 1 : 0,
        product: {
          id: r.products!.id,
          slug: r.products!.slug,
          title: r.products!.title,
          subtitle: r.products!.subtitle,
          basePrice: r.products!.base_price,
          imageUrls: r.products!.image_urls || [],
        },
      })),
  });
}

const CreateSchema = z.object({
  productId: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const payload = CreateSchema.parse(await req.json());
  const id = crypto.randomUUID();

  let exists: Array<{ id: string }> = [];
  try {
    const text = await featuredRest(`?select=id&product_id=eq.${encodeURIComponent(payload.productId)}&limit=1`);
    exists = JSON.parse(text || "[]") as Array<{ id: string }>;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  if (exists[0]?.id) return NextResponse.json({ error: "already_exists" }, { status: 409 });

  let sortOrder = payload.sortOrder;
  if (sortOrder === undefined) {
    const text = await featuredRest("?select=sort_order&order=sort_order.desc&limit=1");
    const maxRows = JSON.parse(text || "[]") as Array<{ sort_order?: number | null }>;
    sortOrder = (maxRows[0]?.sort_order ?? 0) + 1;
  }

  const row = {
    id,
    product_id: payload.productId,
    sort_order: sortOrder,
    is_active: payload.isActive,
  };
  try {
    await featuredRest("", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("23505") && error.message.includes(id)) {
      return NextResponse.json({ data: { id } }, { status: 201 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ data: { id } }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const payload = PatchSchema.parse(await req.json());
  const patch: Record<string, unknown> = {};
  if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  try {
    await featuredRest(`?id=eq.${encodeURIComponent(payload.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  try {
    await featuredRest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

