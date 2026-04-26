import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabaseServer";

export async function GET() {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("raffle_prizes")
    .select("id,title,product_id,sort_order,is_active,created_at,products:product_id(id,slug,title,image_urls)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as unknown as Array<{
    id: string;
    title: string;
    product_id: string | null;
    sort_order: number;
    products: { id: string; slug: string; title: string; image_urls: string[] | null } | null;
  }>;

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      sortOrder: r.sort_order,
      product: r.products
        ? { id: r.products.id, slug: r.products.slug, title: r.products.title, imageUrls: r.products.image_urls || [] }
        : null,
    })),
  });
}

