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

async function heroRest(path: string, init: RequestInit = {}) {
  const baseUrl = mustEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/hero_slides${path}`, {
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
    const text = await heroRest("?select=id,title,image_url,link_url,sort_order,is_active&order=sort_order.asc");
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    const message = error.message.toLowerCase();
    if (!message.includes("image_url") && !message.includes("link_url")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    data = await loadHeroRowsWithAvailableColumns(message);
  }

  const rows = data as unknown as Array<{ id: string; title: string; image_url?: string | null; link_url?: string | null; sort_order: number; is_active: boolean }>;
  const mapped = rows.map((s) => ({
    id: s.id,
    title: s.title,
    imageUrl: s.image_url ?? null,
    linkUrl: s.link_url ?? null,
    previewImageUrl: s.image_url ?? s.link_url ?? null,
    sortOrder: s.sort_order,
    isActive: s.is_active ? 1 : 0,
  }));
  return NextResponse.json({ data: mapped });
}

async function loadHeroRowsWithAvailableColumns(message: string) {
  const selects = [
    "id,title,image_url,link_url,sort_order,is_active",
    "id,title,link_url,sort_order,is_active",
    "id,title,image_url,sort_order,is_active",
    "id,title,sort_order,is_active",
  ];
  let fallbackMessage = message;
  for (const select of selects) {
    try {
      const text = await heroRest(`?select=${select}&order=sort_order.asc`);
      return JSON.parse(text || "[]") as unknown[];
    } catch (error) {
      fallbackMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!fallbackMessage.includes("image_url") && !fallbackMessage.includes("link_url")) throw error;
    }
  }
  throw new Error(fallbackMessage);
}

const CreateSchema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().nullable().optional().default(null),
  linkUrl: z.string().nullable().optional().default(null),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = CreateSchema.parse(await req.json());
  const id = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id,
    title: payload.title,
    sort_order: payload.sortOrder,
    is_active: payload.isActive,
  };
  if (payload.imageUrl) row.image_url = payload.imageUrl;
  if (payload.linkUrl) row.link_url = payload.linkUrl;
  try {
    await heroRest("", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("23505") && error.message.includes(String(row.id))) {
      return NextResponse.json({ data: { id } }, { status: 201 });
    }
    if (!(error instanceof Error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    const message = error.message.toLowerCase();
    if (message.includes("link_url")) {
      if (payload.linkUrl) {
        return NextResponse.json(
          {
            error: "hero_link_url_column_missing",
            message: "Hero link cannot be saved: apply migration that adds hero_slides.link_url",
          },
          { status: 409 },
        );
      }
      delete row.link_url;
    }
    if (message.includes("image_url")) delete row.image_url;
    if (!message.includes("link_url") && !message.includes("image_url")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    try {
      await heroRest("", {
        method: "POST",
        headers: { "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify(row),
      });
    } catch (fallbackError) {
      if (fallbackError instanceof Error && fallbackError.message.includes("23505") && fallbackError.message.includes(String(row.id))) {
        return NextResponse.json({ data: { id } }, { status: 201 });
      }
      return NextResponse.json({ error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) }, { status: 500 });
    }
  }
  return NextResponse.json({ data: { id } }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  imageUrl: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = PatchSchema.parse(await req.json());
  const patch: Record<string, unknown> = {};
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.imageUrl !== undefined) patch.image_url = payload.imageUrl;
  if (payload.linkUrl !== undefined) patch.link_url = payload.linkUrl;
  if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  try {
    await heroRest(`?id=eq.${encodeURIComponent(payload.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    const message = error.message.toLowerCase();
    const ignored = [];
    if (message.includes("image_url") && "image_url" in patch) {
      delete patch.image_url;
      ignored.push("imageUrl");
    }
    if (message.includes("link_url") && "link_url" in patch) {
      return NextResponse.json(
        {
          error: "hero_link_url_column_missing",
          message: "Hero link cannot be saved: apply migration that adds hero_slides.link_url",
        },
        { status: 409 },
      );
    }
    if (!ignored.length) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true, ignored });
    try {
      await heroRest(`?id=eq.${encodeURIComponent(payload.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
    } catch (fallbackError) {
      return NextResponse.json({ error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) }, { status: 500 });
    }
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
    await heroRest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

