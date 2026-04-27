import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabaseServer";

export async function GET() {
  const sb = supabaseAnon();
  const withImage = await sb
    .from("hero_slides")
    .select("id,title,image_url,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const fallback =
    withImage.error && withImage.error.message.toLowerCase().includes("image_url")
      ? await sb.from("hero_slides").select("id,title,sort_order,is_active").eq("is_active", true).order("sort_order", { ascending: true })
      : null;
  const data = (fallback ? fallback.data : withImage.data) || [];
  const error = fallback ? fallback.error : withImage.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type HeroRow = { id: string; title: string; image_url?: string | null; sort_order?: number; is_active?: boolean };
  const enriched = (data as HeroRow[]).map((s) => {
    if (!s) return s;
    return { ...s, image_url: s.image_url ?? null };
  });

  return NextResponse.json({ data: enriched });
}

