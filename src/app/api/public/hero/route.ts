import { NextResponse } from "next/server";

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function heroRest(path: string) {
  const baseUrl = must("SUPABASE_URL").replace(/\/$/, "");
  const anonKey = must("SUPABASE_ANON_KEY");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/hero_slides${path}`, {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Supabase REST ${response.status}`);
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function GET() {
  let data: unknown[] = [];
  try {
    const text = await heroRest("?select=id,title,image_url,sort_order,is_active&is_active=eq.true&order=sort_order.asc");
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("image_url")) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    try {
      const text = await heroRest("?select=id,title,sort_order,is_active&is_active=eq.true&order=sort_order.asc");
      data = JSON.parse(text || "[]") as unknown[];
    } catch (fallbackError) {
      return NextResponse.json({ error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) }, { status: 500 });
    }
  }

  type HeroRow = { id: string; title: string; image_url?: string | null; sort_order?: number; is_active?: boolean };
  const enriched = (data as HeroRow[]).map((s) => {
    if (!s) return s;
    return { ...s, image_url: s.image_url ?? null };
  });

  return NextResponse.json({ data: enriched });
}

