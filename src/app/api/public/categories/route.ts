import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabaseServer";

type CategoryRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  sort_order: number;
  is_hidden: boolean;
};

let cache: CategoryRow[] | null = null;
let cacheAt = 0;

export async function GET() {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("categories")
    .select("id,slug,title,image_url,sort_order,is_hidden")
    .eq("is_hidden", false)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) {
    if (cache) {
      return NextResponse.json(
        { data: cache, stale: true },
        {
          headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cacheAt) },
        },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  cache = data || [];
  cacheAt = Date.now();
  return NextResponse.json({ data });
}

