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
  cardImageScale: number;
  cardImagePositionX: number;
  cardImagePositionY: number;
  characteristicsText: string;
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

function collapseIphoneModels(items: ApiProduct[]): ApiProduct[] {
  const colorSuffixes = [
    "sage",
    "lavender",
    "blue",
    "black",
    "white",
    "pink",
    "green",
    "yellow",
    "orange",
    "silver",
    "gold",
    "purple",
    "ultramarine",
    "teal",
    "starlight",
    "midnight",
    "natural",
    "desert",
  ];
  const suffixRe = new RegExp(`\\s(?:${colorSuffixes.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`, "i");
  const grouped = new Map<string, ApiProduct>();

  for (const p of items) {
    const normalizedTitle = p.title.replace(suffixRe, "").trim();
    const normalizedSlug = p.slug.replace(/-(sage|lavender|blue|black|white|pink|green|yellow|orange|silver|gold|purple|ultramarine|teal|starlight|midnight|natural|desert)$/i, "");
    const key = normalizedTitle.toLowerCase();
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...p,
        title: normalizedTitle || p.title,
        slug: normalizedSlug || p.slug,
        imageUrls: Array.isArray(p.imageUrls) ? [...p.imageUrls] : [],
        cardColors: Array.isArray(p.cardColors) ? [...p.cardColors] : [],
        variants: Array.isArray(p.variants) ? [...p.variants] : [],
      });
      continue;
    }

    existing.variants = [...existing.variants, ...(p.variants || [])];
    existing.imageUrls = Array.from(new Set([...(existing.imageUrls || []), ...(p.imageUrls || [])]));
    existing.cardColors = Array.from(new Set([...(existing.cardColors || []), ...(p.cardColors || [])]));
    const minA = Number(existing.basePrice || 0);
    const minB = Number(p.basePrice || 0);
    if ((minA <= 0 && minB > 0) || (minB > 0 && minB < minA)) existing.basePrice = minB;
  }

  return Array.from(grouped.values()).map((p) => ({
    ...p,
    variants: (p.variants || [])
      .slice()
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      .filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
  }));
}

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

  function staleOrEmpty(error: unknown) {
    const cached = cacheByCategory.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { data: cached.data, stale: true },
        { headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cached.at) } },
      );
    }
    return NextResponse.json({ data: [], stale: true, error: error instanceof Error ? error.message : String(error) });
  }

  function isMissingProductSettingsColumn(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("card_colors") || message.includes("characteristics_text") || message.includes("card_image_scale") || message.includes("card_image_position");
  }

  const fullProductSelect = `
          id,slug,title,subtitle,category_id,base_price,image_urls,card_colors,card_image_scale,card_image_position_x,card_image_position_y,characteristics_text,is_active,
          categories:category_id ( slug,title ),
          product_variants ( id, storage_gb, sim_type, colors, image_url, price, sku, in_stock )
        `;
  const legacyProductSelect = `
          id,slug,title,subtitle,category_id,base_price,image_urls,is_active,
          categories:category_id ( slug,title ),
          product_variants ( id, storage_gb, sim_type, colors, image_url, price, sku, in_stock )
        `;

  let categoryId: string | null = null;
  if (categorySlug) {
    const normalizedCategorySlug = (() => {
      // Legacy storefront slugs → DB slugs (imported categories).
      // Keep this in sync with `public/catalog/_category.html` mapping.
      const m: Record<string, string> = {
        "air-pods": "air-pods",
        airpods: "air-pods",
        "apple-watch": "apple-watch",
        applewatch: "apple-watch",
        mac: "macbook",
      };
      return m[categorySlug] || categorySlug;
    })();

    if (categorySlug === "iphone") {
      // Aggregator category: include all iPhone categories imported from the donor.
      let catsResult;
      try {
        catsResult = await sb.from("categories").select("id,slug").or("slug.eq.iphone,slug.ilike.appleiphone%").abortSignal(AbortSignal.timeout(8000));
      } catch (error) {
        return staleOrEmpty(error);
      }
      const { data: cats, error: catsErr } = catsResult;
      if (catsErr) {
        return staleOrEmpty(catsErr);
      }
      const ids = (cats || []).map((c: { id: string }) => c.id).filter(Boolean);
      if (!ids.length) return NextResponse.json({ data: [] });

      let q: any = sb
        .from("products")
        .select(fullProductSelect)
        .eq("is_active", true)
        .in("category_id", ids)
        .order("base_price", { ascending: false });

      if (searchQ) {
        const like = `%${escLike(searchQ)}%`;
        q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
      }
      if (limit) q = q.limit(limit);

      let result;
      try {
        result = await q.abortSignal(AbortSignal.timeout(8000));
      } catch (error) {
        if (isMissingProductSettingsColumn(error)) {
          q = sb
            .from("products")
            .select(legacyProductSelect)
            .eq("is_active", true)
            .in("category_id", ids)
            .order("base_price", { ascending: false });
          if (searchQ) {
            const like = `%${escLike(searchQ)}%`;
            q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
          }
          if (limit) q = q.limit(limit);
          result = await q.abortSignal(AbortSignal.timeout(8000));
        } else {
          return staleOrEmpty(error);
        }
      }
      if (result?.error && isMissingProductSettingsColumn(result.error)) {
        q = sb
          .from("products")
          .select(legacyProductSelect)
          .eq("is_active", true)
          .in("category_id", ids)
          .order("base_price", { ascending: false });
        if (searchQ) {
          const like = `%${escLike(searchQ)}%`;
          q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
        }
        if (limit) q = q.limit(limit);
        result = await q.abortSignal(AbortSignal.timeout(8000));
      }
      const { data, error } = result;
      if (error) {
        return staleOrEmpty(error);
      }

      const rows = (data || []) as unknown as Array<{
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
        cardColors: Array.isArray(p.card_colors) ? p.card_colors : [],
        cardImageScale: Number(p.card_image_scale || 1.42),
        cardImagePositionX: Number(p.card_image_position_x ?? 50),
        cardImagePositionY: Number(p.card_image_position_y ?? 50),
        characteristicsText: p.characteristics_text || "",
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

      const collapsed = collapseIphoneModels(mapped);
      const filtered = applySearchFilter(collapsed);
      cacheByCategory.set(cacheKey, { at: Date.now(), data: filtered });
      return NextResponse.json({ data: filtered });
    }

    let catResult;
    try {
      catResult = await sb.from("categories").select("id").eq("slug", normalizedCategorySlug).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
    } catch (error) {
      return staleOrEmpty(error);
    }
    const { data: cat, error: catErr } = catResult;
    if (catErr) {
      return staleOrEmpty(catErr);
    }
    categoryId = cat?.id ?? null;
    if (!categoryId) return NextResponse.json({ data: [] });
  }

  let q: any = sb
    .from("products")
    .select(fullProductSelect)
    .eq("is_active", true)
    .order("base_price", { ascending: false });

  if (categoryId) q = q.eq("category_id", categoryId);
  if (searchQ) {
    const like = `%${escLike(searchQ)}%`;
    q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
  }
  if (limit) q = q.limit(limit);

  let result;
  try {
    result = await q.abortSignal(AbortSignal.timeout(8000));
  } catch (error) {
    if (isMissingProductSettingsColumn(error)) {
      q = sb
        .from("products")
        .select(legacyProductSelect)
        .eq("is_active", true)
        .order("base_price", { ascending: false });
      if (categoryId) q = q.eq("category_id", categoryId);
      if (searchQ) {
        const like = `%${escLike(searchQ)}%`;
        q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
      }
      if (limit) q = q.limit(limit);
      result = await q.abortSignal(AbortSignal.timeout(8000));
    } else {
      return staleOrEmpty(error);
    }
  }
  if (result?.error && isMissingProductSettingsColumn(result.error)) {
    q = sb.from("products").select(legacyProductSelect).eq("is_active", true).order("base_price", { ascending: false });
    if (categoryId) q = q.eq("category_id", categoryId);
    if (searchQ) {
      const like = `%${escLike(searchQ)}%`;
      q = q.or(`title.ilike.${like},slug.ilike.${like},subtitle.ilike.${like}`);
    }
    if (limit) q = q.limit(limit);
    result = await q.abortSignal(AbortSignal.timeout(8000));
  }
  const { data, error } = result;
  if (error) {
    return staleOrEmpty(error);
  }

  const rows = (data || []) as unknown as Array<{
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
    cardColors: Array.isArray(p.card_colors) ? p.card_colors : [],
    cardImageScale: Number(p.card_image_scale || 1.42),
    cardImagePositionX: Number(p.card_image_position_x ?? 50),
    cardImagePositionY: Number(p.card_image_position_y ?? 50),
    characteristicsText: p.characteristics_text || "",
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

