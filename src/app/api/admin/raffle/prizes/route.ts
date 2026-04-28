import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";
import crypto from "node:crypto";

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

async function raffleRest(path: string, init: RequestInit = {}) {
  const baseUrl = mustEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/raffle_prizes${path}`, {
        ...init,
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          ...(init.headers || {}),
        },
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
    const text = await raffleRest("?select=id,title,product_id,sort_order,is_active,created_at,products:product_id(id,slug,title)&order=sort_order.asc,created_at.asc");
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }

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
  const row = {
    id,
    title: payload.title,
    product_id: payload.productId,
    sort_order: payload.sortOrder,
    is_active: payload.isActive,
  };
  try {
    await raffleRest("", {
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

  try {
    await raffleRest(`?id=eq.${encodeURIComponent(payload.id)}`, {
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
    await raffleRest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

