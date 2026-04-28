import { NextResponse } from "next/server";

const REST_TIMEOUT_MS = 5_000;
const REST_RETRIES = 3;

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function restJson<T>(path: string): Promise<T> {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const anonKey = must("SUPABASE_ANON_KEY");
  let lastError: unknown = null;

  for (let attempt = 0; attempt < REST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
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

export async function GET() {
  let data;
  try {
    data = await restJson<unknown[]>(
      "raffle_prizes?select=id,title,product_id,sort_order,is_active,created_at,products:product_id(id,slug,title,image_urls)&is_active=eq.true&order=sort_order.asc,created_at.asc",
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }

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

