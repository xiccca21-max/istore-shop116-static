import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/adminAuth";
import { z } from "zod";
import crypto from "node:crypto";
import { supabaseService } from "@/lib/supabaseServer";
import { readEtalonHeroSlidesFromWww } from "@/lib/heroEtalon";

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
  const withImage = await sb.from("hero_slides").select("id,title,image_url,sort_order,is_active").order("sort_order", { ascending: true });
  const fallback =
    withImage.error && withImage.error.message.toLowerCase().includes("image_url")
      ? await sb.from("hero_slides").select("id,title,sort_order,is_active").order("sort_order", { ascending: true })
      : null;
  const data = (fallback ? fallback.data : withImage.data) || [];
  const error = fallback ? fallback.error : withImage.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data as unknown as Array<{ id: string; title: string; image_url?: string | null; sort_order: number; is_active: boolean }>;
  const etalonByTitle = (() => {
    try {
      const etalon = readEtalonHeroSlidesFromWww();
      return new Map(etalon.map((s) => [s.title, s.imageUrl]));
    } catch {
      return new Map<string, string | null>();
    }
  })();
  const mapped = rows.map((s) => ({
    id: s.id,
    title: s.title,
    imageUrl: (s.image_url ?? null) || (etalonByTitle.get(s.title) ?? null),
    sortOrder: s.sort_order,
    isActive: s.is_active ? 1 : 0,
  }));
  return NextResponse.json({ data: mapped });
}

const CreateSchema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().nullable().optional().default(null),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await mustAuth(req);
  if (auth) return auth;
  const payload = CreateSchema.parse(await req.json());
  const id = crypto.randomUUID();
  const sb = supabaseService();
  const { error } = await sb.from("hero_slides").insert({
    id,
    title: payload.title,
    image_url: payload.imageUrl,
    sort_order: payload.sortOrder,
    is_active: payload.isActive,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  imageUrl: z.string().nullable().optional(),
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
  if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "no_fields" }, { status: 400 });

  const sb = supabaseService();
  const { error } = await sb.from("hero_slides").update(patch).eq("id", payload.id);
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
  const { error } = await sb.from("hero_slides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

