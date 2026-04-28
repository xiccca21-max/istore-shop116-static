import { NextResponse } from "next/server";

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
const REST_TIMEOUT_MS = 5_000;
const REST_RETRIES = 3;

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function loadCategories(): Promise<CategoryRow[]> {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const anonKey = must("SUPABASE_ANON_KEY");
  const params = new URLSearchParams();
  params.set("select", "id,slug,title,image_url,sort_order,is_hidden");
  params.set("is_hidden", "eq.false");
  params.set("order", "sort_order.asc,title.asc");
  let lastError: unknown = null;

  for (let attempt = 0; attempt < REST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/rest/v1/categories?${params.toString()}`, {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
      return JSON.parse(text) as CategoryRow[];
    } catch (error) {
      lastError = error;
      if (attempt === REST_RETRIES - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function GET() {
  try {
    const data = await loadCategories();
    cache = data || [];
    cacheAt = Date.now();
    return NextResponse.json({ data });
  } catch (error) {
    if (cache) {
      return NextResponse.json(
        { data: cache, stale: true },
        {
          headers: { "x-cache": "stale-if-error", "x-cache-age-ms": String(Date.now() - cacheAt) },
        },
      );
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

