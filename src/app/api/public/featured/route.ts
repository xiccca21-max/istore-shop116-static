import { NextResponse } from "next/server";

const REST_TIMEOUT_MS = 5_000;
const REST_RETRIES = 3;

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function featuredRest(path: string) {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const anonKey = must("SUPABASE_ANON_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < REST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/homepage_featured_products${path}`, {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REST_TIMEOUT_MS),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < REST_RETRIES - 1) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

type ApiProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  categoryId: string;
  basePrice: number;
  imageUrls: string[];
  cardColors: string[];
  cardImageScale: number;
  cardImagePositionX: number;
  cardImagePositionY: number;
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
  const fullSelect =
    "id,sort_order,is_active,product_id,products:product_id(id,slug,title,subtitle,category_id,base_price,image_urls,card_colors,card_image_scale::text,card_image_position_x,card_image_position_y,characteristics_text,is_active,product_variants(id,storage_gb,sim_type,colors,image_url,price,sku,in_stock))";
  const legacySelect =
    "id,sort_order,is_active,product_id,products:product_id(id,slug,title,subtitle,category_id,base_price,image_urls,is_active,product_variants(id,storage_gb,sim_type,colors,image_url,price,sku,in_stock))";
  let data: unknown[] = [];
  try {
    const text = await featuredRest(`?select=${encodeURIComponent(fullSelect)}&is_active=eq.true&order=sort_order.asc`);
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("card_colors") && !message.includes("characteristics_text") && !message.includes("card_image_scale") && !message.includes("card_image_position")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    try {
      const text = await featuredRest(`?select=${encodeURIComponent(legacySelect)}&is_active=eq.true&order=sort_order.asc`);
      data = JSON.parse(text || "[]") as unknown[];
    } catch (fallbackError) {
      return NextResponse.json({ error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) }, { status: 500 });
    }
  }

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
      card_image_scale?: number | null;
      card_image_position_x?: number | null;
      card_image_position_y?: number | null;
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
      cardImageScale: Number(p!.card_image_scale || 1),
      cardImagePositionX: Number(p!.card_image_position_x ?? 50),
      cardImagePositionY: Number(p!.card_image_position_y ?? 50),
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

