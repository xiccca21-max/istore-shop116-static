type ProductDetailRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  base_price: number;
  image_urls: string[] | null;
  card_image_scale?: string | number | null;
  card_image_position_x?: number | null;
  card_image_position_y?: number | null;
  characteristics_text?: string | null;
  categories: { slug?: string; title?: string } | null;
  product_variants: Array<Record<string, unknown>> | null;
};

const REST_TIMEOUT_MS = 5_000;
const REST_RETRIES = 3;

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function restProducts<T>(params: URLSearchParams): Promise<T> {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");
  let lastError: unknown = null;

  for (let attempt = 0; attempt < REST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/rest/v1/products?${params.toString()}`, {
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (attempt === REST_RETRIES - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function paramsForProduct(slug: string, select: string) {
  const params = new URLSearchParams();
  params.set("select", select);
  params.set("slug", `eq.${normalizeRouteSlug(slug)}`);
  params.set("limit", "1");
  return params;
}

function normalizeRouteSlug(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isMissingProductSettingsColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("characteristics_text") || message.includes("card_image_scale") || message.includes("card_image_position");
}

export async function loadProductDetailBySlug(slug: string): Promise<ProductDetailRow | null> {
  const fullSelect =
    "id,slug,title,subtitle,base_price,image_urls,card_image_scale::text,card_image_position_x,card_image_position_y,characteristics_text,categories:category_id(slug,title),product_variants(id,storage_gb,sim_type,colors,image_url,price,sku,in_stock)";
  const legacySelect =
    "id,slug,title,subtitle,base_price,image_urls,categories:category_id(slug,title),product_variants(id,storage_gb,sim_type,colors,image_url,price,sku,in_stock)";

  try {
    const rows = await restProducts<ProductDetailRow[]>(paramsForProduct(slug, fullSelect));
    return rows[0] || null;
  } catch (error) {
    if (!isMissingProductSettingsColumn(error)) throw error;
    const rows = await restProducts<ProductDetailRow[]>(paramsForProduct(slug, legacySelect));
    return rows[0] || null;
  }
}
