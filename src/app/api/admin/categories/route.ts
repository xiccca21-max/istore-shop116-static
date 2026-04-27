import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

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

async function categoriesRest(pathAndQuery: string, init: RequestInit = {}) {
  const baseUrl = mustEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/categories${pathAndQuery}`, {
        ...init,
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          ...(init.headers || {}),
        },
        signal: AbortSignal.timeout(12000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
      return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

let catalogAllowSlugsCache: { at: number; slugs: Set<string> } | null = null;
function getCatalogAllowSlugs(): Set<string> | null {
  try {
    const now = Date.now();
    if (catalogAllowSlugsCache && now - catalogAllowSlugsCache.at < 60_000) return catalogAllowSlugsCache.slugs;
    const htmlPath = path.join(process.cwd(), "public", "catalog", "index.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    const $ = cheerio.load(html);
    const slugs = new Set<string>();
    $(".catalog-grid a.catalog-tile")
      .each((_i, el) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/\/catalog\/([^/]+)\/?/i);
        if (m && m[1]) slugs.add(String(m[1]).trim());
      });
    catalogAllowSlugsCache = { at: now, slugs };
    return slugs;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  let data;
  try {
    const text = await categoriesRest("?select=id,slug,title,image_url,sort_order,is_hidden&order=sort_order.asc,title.asc");
    data = JSON.parse(text);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  const rows = (data || []) as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    image_url: string | null;
    sort_order: number;
    is_hidden: boolean;
  }>;
  const allow = getCatalogAllowSlugs();
  const filtered = rows.filter((c) => {
    // Keep only catalog categories in admin UI (catalog is the source of truth).
    // Additionally: keep only one iPhone category in admin UI: "iphone".
    if (c.slug.startsWith("appleiphone")) return false;
    if (allow) return allow.has(c.slug);
    return true;
  });
  const mapped = filtered.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    imageUrl: c.image_url,
    sortOrder: c.sort_order,
    isHidden: !!c.is_hidden,
  }));
  return NextResponse.json({ data: mapped });
}

const CreateSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  imageUrl: z.string().nullable().optional().default(null),
  sortOrder: z.number().int().optional().default(0),
  isHidden: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = CreateSchema.parse(await req.json());
  const id = crypto.randomUUID();
  const row = {
    id,
    slug: payload.slug,
    title: payload.title,
    image_url: payload.imageUrl,
    sort_order: payload.sortOrder,
    is_hidden: payload.isHidden,
  };
  try {
    await categoriesRest("", {
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
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isHidden: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = PatchSchema.parse(await req.json());
  const patch: Record<string, unknown> = {};
  if (payload.slug !== undefined) patch.slug = payload.slug;
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.imageUrl !== undefined) patch.image_url = payload.imageUrl;
  if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder;
  if (payload.isHidden !== undefined) patch.is_hidden = payload.isHidden;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });
  try {
    await categoriesRest(`?id=eq.${encodeURIComponent(payload.id)}`, {
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
    await categoriesRest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

