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
  isActive: boolean;
  categorySlug?: string;
  categoryTitle?: string;
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

const cacheByCategory = new Map<string, { at: number; data: ApiProduct[] }>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("category");
  const searchQ = (url.searchParams.get("q") || "").trim();
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(0, Math.min(50, parseInt(limitRaw, 10) || 0)) : 0;
  const cacheKey = `${categorySlug || "__all__"}|q=${searchQ.toLowerCase()}|l=${limit || 0}`;

  const sb = supabaseAnon();

  function escLike(s: string) {
    // Escape characters meaningful to LIKE/ILIKE and PostgREST filters.
    return s.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", "\\,");
  }

  function applySearchFilter<T extends { title: string; subtitle: string; slug: string }>(rows: T[]): T[] {
    if (!searchQ) return rows;
    const q = searchQ.toLowerCase();
    return rows.filter((p) => `${p.title} ${p.subtitle} ${p.slug}`.toLowerCase().includes(q));
  }

  let categoryId: string | null = null;
  if (categorySlug) {
    const normalizedCategorySlug = (() => {
      // Legacy storefront slugs → DB slugs (imported categories).
      // Keep this in sync with `public/catalog/_category.html` mapping.
      const m: Record<string, string> = {
        "air-pods": "airpods",
        "apple-watch": "applewatch",
        mac: "macbook",
      };
      return m[categorySlug] || categorySlug;
    })();

    if (categorySlug === "iphone") {
      // Aggregator category: include all iPhone categories imported from the donor.
      const { data: cats, error: catsErr } = await sb
        .from("categories")
        .select("id,slug")
        .or("slug.eq.iphone,slug.ilike.appleiphone%");
      if (catsErr) {
        const cached = cacheByCategory.get(cacheKey);
        if (cached) {
          return NextResponse.json(
            { data: cached.data, stale: true },
            { headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cached.at) } },
          );
        }
        return NextResponse.json({ error: catsErr.message }, { status: 500 });
      }
      const ids = (cats || []).map((c: { id: string }) => c.id).filter(Boolean);
      if (!ids.length) return NextResponse.json({ data: [] });

      let q = sb
        .from("products")
        .select(
          `
          id,slug,title,subtitle,category_id,base_price,image_urls,is_active,
          categories:category_id ( slug,title ),
          product_variants ( id, storage_gb, sim_type, colors, image_url, price, sku, in_stock )
        `,
        )
        .eq("is_active", true)
        .in("category_id", ids)
        .order("base_price", { ascending: false });

      if (searchQ) {
        const like = `%${escLike(searchQ)}%`;
        q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
      }
      if (limit) q = q.limit(limit);

      const { data, error } = await q;
      if (error) {
        const cached = cacheByCategory.get(cacheKey);
        if (cached) {
          return NextResponse.json(
            { data: cached.data, stale: true },
            { headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cached.at) } },
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows = (data || []) as unknown as Array<{
        id: string;
        slug: string;
        title: string;
        subtitle: string;
        category_id: string;
        base_price: number;
        image_urls: string[] | null;
        is_active: boolean;
        categories: { slug: string; title: string } | null;
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
      }>;

      const mapped: ApiProduct[] = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        categoryId: p.category_id,
        basePrice: p.base_price,
        imageUrls: p.image_urls || [],
        isActive: p.is_active,
        categorySlug: p.categories?.slug,
        categoryTitle: p.categories?.title,
        variants: (p.product_variants || []).map((v) => ({
          id: v.id,
          productId: p.id,
          storageGb: v.storage_gb,
          simType: v.sim_type,
          colors: v.colors || [],
          imageUrl: v.image_url ?? null,
          price: v.price,
          sku: v.sku,
          inStock: v.in_stock,
        })),
      }));

      const filtered = applySearchFilter(mapped);
      cacheByCategory.set(cacheKey, { at: Date.now(), data: filtered });
      return NextResponse.json({ data: filtered });
    }

    const { data: cat, error: catErr } = await sb.from("categories").select("id").eq("slug", normalizedCategorySlug).maybeSingle();
    if (catErr) {
      const cached = cacheByCategory.get(cacheKey);
      if (cached) {
        return NextResponse.json(
          { data: cached.data, stale: true },
          { headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cached.at) } },
        );
      }
      return NextResponse.json({ error: catErr.message }, { status: 500 });
    }
    categoryId = cat?.id ?? null;
    if (!categoryId) return NextResponse.json({ data: [] });
  }

  let q = sb
    .from("products")
    .select(
      `
      id,slug,title,subtitle,category_id,base_price,image_urls,is_active,
      categories:category_id ( slug,title ),
      product_variants ( id, storage_gb, sim_type, colors, image_url, price, sku, in_stock )
    `,
    )
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  if (categoryId) q = q.eq("category_id", categoryId);
  if (searchQ) {
    const like = `%${escLike(searchQ)}%`;
    q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
  }
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    const cached = cacheByCategory.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { data: cached.data, stale: true },
        { headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cached.at) } },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    category_id: string;
    base_price: number;
    image_urls: string[] | null;
    is_active: boolean;
    categories: { slug: string; title: string } | null;
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
  }>;

  const mapped: ApiProduct[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    categoryId: p.category_id,
    basePrice: p.base_price,
    imageUrls: p.image_urls || [],
    isActive: p.is_active,
    categorySlug: p.categories?.slug,
    categoryTitle: p.categories?.title,
    variants: (p.product_variants || []).map((v) => ({
      id: v.id,
      productId: p.id,
      storageGb: v.storage_gb,
      simType: v.sim_type,
      colors: v.colors || [],
      imageUrl: v.image_url ?? null,
      price: v.price,
      sku: v.sku,
      inStock: v.in_stock,
    })),
  }));

  const filtered = applySearchFilter(mapped);
  cacheByCategory.set(cacheKey, { at: Date.now(), data: filtered });
  return NextResponse.json({ data: filtered });
}

