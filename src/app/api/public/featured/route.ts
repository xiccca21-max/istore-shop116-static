import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabaseServer";

type ApiProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  categoryId: string;
  basePrice: number;
  imageUrls: string[];
  cardColors: string[];
  characteristicsText: string;
  isActive: boolean;
  variants: Array<{
    id: string;
    productId: string;
    storageGb: number;
    simType: string;
    colors: string[];
    imageUrl: string | null;
    price: number;
    sku: string | null;
    inStock: boolean;
  }>;
};

export async function GET() {
  const sb = supabaseAnon();

  const fullSelect =
    "id,sort_order,is_active,product_id,products:product_id(id,slug,title,subtitle,category_id,base_price,image_urls,card_colors,characteristics_text,is_active,product_variants(id,storage_gb,sim_type,colors,image_url,price,sku,in_stock))";
  const legacySelect =
    "id,sort_order,is_active,product_id,products:product_id(id,slug,title,subtitle,category_id,base_price,image_urls,is_active,product_variants(id,storage_gb,sim_type,colors,image_url,price,sku,in_stock))";
  let result: any = await sb.from("homepage_featured_products").select(fullSelect).eq("is_active", true).order("sort_order", { ascending: true });
  if (result.error && (result.error.message.includes("card_colors") || result.error.message.includes("characteristics_text"))) {
    result = await sb.from("homepage_featured_products").select(legacySelect).eq("is_active", true).order("sort_order", { ascending: true });
  }

  const { data, error } = result;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as unknown as Array<{
    products: {
      id: string;
      slug: string;
      title: string;
      subtitle: string;
      category_id: string;
      base_price: number;
      image_urls: string[] | null;
      card_colors?: string[] | null;
      characteristics_text?: string | null;
      is_active: boolean;
      product_variants: Array<{
        id: string;
        storage_gb: number;
        sim_type: string;
        colors: string[] | null;
        image_url?: string | null;
        price: number;
        sku: string | null;
        in_stock: boolean;
      }> | null;
    } | null;
  }>;

  const mapped: ApiProduct[] = rows
    .map((r) => r.products)
    .filter((p): p is NonNullable<(typeof rows)[number]["products"]> => p != null && p.is_active)
    .map((p) => ({
      id: p!.id,
      slug: p!.slug,
      title: p!.title,
      subtitle: p!.subtitle,
      categoryId: p!.category_id,
      basePrice: p!.base_price,
      imageUrls: p!.image_urls || [],
      cardColors: Array.isArray(p!.card_colors) ? p!.card_colors : [],
      characteristicsText: p!.characteristics_text || "",
      isActive: p!.is_active,
      variants: (p!.product_variants || []).map((v) => ({
        id: v.id,
        productId: p!.id,
        storageGb: v.storage_gb,
        simType: v.sim_type,
        colors: v.colors || [],
        imageUrl: v.image_url ?? null,
        price: v.price,
        sku: v.sku,
        inStock: v.in_stock,
      })),
    }));

  return NextResponse.json({ data: mapped });
}

