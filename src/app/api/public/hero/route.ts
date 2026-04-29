import { NextResponse } from "next/server";
import { normalizeMisplacedHeroImageUrls } from "@/lib/heroSlideUrls";

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
    const text = await heroRest("?select=id,title,image_url,link_url,sort_order,is_active&is_active=eq.true&order=sort_order.asc");
    data = JSON.parse(text || "[]") as unknown[];
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
    const message = error.message.toLowerCase();
    if (!message.includes("image_url") && !message.includes("link_url")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    data = await loadHeroRowsWithAvailableColumns(message);
  }

  type HeroRow = { id: string; title: string; image_url?: string | null; link_url?: string | null; sort_order?: number; is_active?: boolean };
  const enriched = (data as HeroRow[]).map((s) => {
    if (!s) return s;
    const n = normalizeMisplacedHeroImageUrls(s.image_url, s.link_url);
    return { ...s, image_url: n.image_url, link_url: n.link_url, linkUrl: n.link_url };
  });

  return NextResponse.json(
    { data: enriched },
    {
      headers: {
        // Hero JSON редко меняется; кэш снимает лишний round-trip к Supabase при каждой загрузке главной.
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    },
  );
}

async function loadHeroRowsWithAvailableColumns(message: string) {
  const selects = [
    "id,title,image_url,link_url,sort_order,is_active",
    "id,title,link_url,sort_order,is_active",
    "id,title,image_url,sort_order,is_active",
    "id,title,sort_order,is_active",
  ];
  let fallbackMessage = message;
  for (const select of selects) {
    try {
      const text = await heroRest(`?select=${select}&is_active=eq.true&order=sort_order.asc`);
      return JSON.parse(text || "[]") as unknown[];
    } catch (error) {
      fallbackMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!fallbackMessage.includes("image_url") && !fallbackMessage.includes("link_url")) throw error;
    }
  }
  throw new Error(fallbackMessage);
}

