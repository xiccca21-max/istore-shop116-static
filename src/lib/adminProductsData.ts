export type AdminProduct = {
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
  cardColors: string[];
  characteristicsText: string;
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

export type AdminVariant = AdminProduct["variants"][number];

const CACHE_KEY = "__istoreAdminProductsCache";

type AdminProductsCache = { at: number; data: AdminProduct[] } | null;

function readCache(): AdminProductsCache {
  return ((globalThis as typeof globalThis & Record<string, AdminProductsCache>)[CACHE_KEY] || null) as AdminProductsCache;
}

function writeCache(cache: AdminProductsCache) {
  (globalThis as typeof globalThis & Record<string, AdminProductsCache>)[CACHE_KEY] = cache;
}

export function invalidateAdminProductsCache() {
  writeCache(null);
}

export function getAdminProductsCache() {
  return readCache();
}

export function addAdminProductToCache(product: AdminProduct) {
  const productsCache = readCache();
  if (!productsCache) return;
  writeCache({
    at: Date.now(),
    data: [product, ...productsCache.data.filter((p) => p.id !== product.id)],
  });
}

export function patchAdminProductCache(id: string, patch: Partial<AdminProduct>) {
  const productsCache = readCache();
  if (!productsCache) return;
  writeCache({
    at: Date.now(),
    data: productsCache.data.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  });
}

export function removeAdminProductFromCache(id: string) {
  const productsCache = readCache();
  if (!productsCache) return;
  writeCache({
    at: Date.now(),
    data: productsCache.data.filter((p) => p.id !== id),
  });
}

export function addAdminVariantToCache(variant: AdminVariant) {
  const productsCache = readCache();
  if (!productsCache) return;
  writeCache({
    at: Date.now(),
    data: productsCache.data.map((p) =>
      p.id === variant.productId
        ? {
            ...p,
            variants: [variant, ...p.variants.filter((v) => v.id !== variant.id)],
          }
        : p,
    ),
  });
}

export function patchAdminVariantCache(id: string, patch: Partial<AdminVariant>) {
  const productsCache = readCache();
  if (!productsCache) return;
  writeCache({
    at: Date.now(),
    data: productsCache.data.map((p) => ({
      ...p,
      variants: p.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    })),
  });
}

export function removeAdminVariantFromCache(id: string) {
  const productsCache = readCache();
  if (!productsCache) return;
  writeCache({
    at: Date.now(),
    data: productsCache.data.map((p) => ({
      ...p,
      variants: p.variants.filter((v) => v.id !== id),
    })),
  });
}

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function restJson<T>(path: string): Promise<T> {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
  return JSON.parse(text) as T;
}

function isMissingProductSettingsColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("card_colors") || message.includes("characteristics_text");
}

async function loadProductRows() {
  type ProductRow = {
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
    categories: { slug: string; title: string } | null;
  };

  const baseSelect = "id,slug,title,subtitle,category_id,base_price,image_urls,is_active,categories:category_id(slug,title)";
  const fullSelect = "id,slug,title,subtitle,category_id,base_price,image_urls,card_colors,characteristics_text,is_active,categories:category_id(slug,title)";
  try {
    return await restJson<ProductRow[]>(`products?select=${fullSelect}&order=base_price.desc`);
  } catch (error) {
    if (!isMissingProductSettingsColumn(error)) throw error;
    return restJson<ProductRow[]>(`products?select=${baseSelect}&order=base_price.desc`);
  }
}

export async function loadAdminProductsFromDb(): Promise<AdminProduct[]> {
  const [iphoneCats, data, variantsData] = await Promise.all([
    restJson<Array<{ id: string; slug: string; title: string }>>("categories?select=id,slug,title&slug=eq.iphone&limit=1"),
    loadProductRows(),
    restJson<
      Array<{
        id: string;
        product_id: string;
        storage_gb: number;
        sim_type: string;
        colors: string[] | null;
        image_url?: string | null;
        price: number;
        sku: string | null;
        in_stock: boolean;
      }>
    >("product_variants?select=id,product_id,storage_gb,sim_type,colors,image_url,price,sku,in_stock"),
  ]);
  const iphoneCat = iphoneCats[0] || null;
  const iphoneCategory = (iphoneCat || null) as { id?: string; title?: string } | null;

  const productIds = new Set(((data as Array<{ id: string }> | null) || []).map((p) => p.id).filter(Boolean));
  const variantsByProduct = new Map<
    string,
    Array<{
      id: string;
      product_id: string;
      storage_gb: number;
      sim_type: string;
      colors: string[] | null;
      image_url?: string | null;
      price: number;
      sku: string | null;
      in_stock: boolean;
    }>
  >();

  for (const v of ((variantsData as any[]) || []).filter((v) => productIds.has(String(v.product_id)))) {
    const pid = String(v.product_id);
    const arr = variantsByProduct.get(pid) || [];
    arr.push(v);
    variantsByProduct.set(pid, arr);
  }

  const rows = (data || []) as Array<{
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
    categories: { slug: string; title: string } | null;
  }>;

  const mapped = rows.map((p) => {
    const isIphoneFamily = !!p.categories?.slug && (p.categories.slug === "iphone" || p.categories.slug.startsWith("appleiphone"));
    const normalizedCategoryId = isIphoneFamily && iphoneCategory?.id ? iphoneCategory.id : p.category_id;
    const normalizedCategorySlug = isIphoneFamily ? "iphone" : p.categories?.slug;
    const normalizedCategoryTitle = isIphoneFamily ? (iphoneCategory?.title || "iPhone") : p.categories?.title;

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      categoryId: normalizedCategoryId,
      basePrice: p.base_price,
      imageUrls: p.image_urls || [],
      cardColors: Array.isArray(p.card_colors) ? p.card_colors : [],
      characteristicsText: p.characteristics_text || "",
      isActive: p.is_active,
      categorySlug: normalizedCategorySlug,
      categoryTitle: normalizedCategoryTitle,
      variants: (variantsByProduct.get(p.id) || []).map((v) => ({
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
    };
  });

  writeCache({ at: Date.now(), data: mapped });
  return mapped;
}
