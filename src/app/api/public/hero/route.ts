import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServer";
import { readEtalonHeroSlidesFromWww } from "@/lib/heroEtalon";

export async function GET() {
  const sb = supabaseService();
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

  // If DB doesn't have image_url column yet, enrich from the etalon (git) homepage.
  const etalonByTitle = (() => {
    try {
      const etalon = readEtalonHeroSlidesFromWww();
      return new Map(etalon.map((s) => [s.title, s.imageUrl]));
    } catch {
      return new Map<string, string | null>();
    }
  })();

  const enriched = (data as any[]).map((s) => {
    if (!s) return s;
    if (s.image_url) return s;
    const img = etalonByTitle.get(String(s.title || "")) || null;
    return img ? { ...s, image_url: img } : s;
  });

  return NextResponse.json({ data: enriched });
}

