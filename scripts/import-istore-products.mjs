import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseVariantFromTitle(title) {
  const t = String(title).trim();
  // Common patterns: "Apple iPhone 15 128Gb Black", "MacBook Pro 14 M3 8/512", "Galaxy S24 Ultra 512Gb"
  let storageGb = null;
  let color = null;

  const mGb = t.match(/\b(\d{2,5})\s*(?:gb|гб)\b/i);
  if (mGb) storageGb = Number(mGb[1]);

  const mTb = t.match(/\b(\d{1,2})\s*(?:tb|тб)\b/i);
  if (mTb) storageGb = Number(mTb[1]) * 1024;

  // RAM/Storage like 8/512 -> take the second as storage
  const mRam = t.match(/\b(\d{1,2})\s*\/\s*(\d{2,5})\b/);
  if (mRam) storageGb = Number(mRam[2]);

  // Color as last token(s) after storage marker
  if (mGb) {
    const after = t.slice((mGb.index ?? 0) + mGb[0].length).trim();
    if (after) color = after.replace(/^[,.-]\s*/, "").trim();
  }

  return { storageGb, color };
}

function baseModelFromTitle(title) {
  let t = String(title).trim();
  t = t.replace(/\b\d{1,2}\s*\/\s*\d{2,5}\b/g, ""); // 8/512
  t = t.replace(/\b\d{1,2}\s*(?:tb|тб)\b/gi, ""); // 1TB
  t = t.replace(/\b\d{2,5}\s*(?:gb|гб)\b/gi, ""); // 256Gb
  t = t.replace(/\s{2,}/g, " ").trim();
  // if trailing color word remains, we keep it in variants only when possible;
  // for safety, drop a single trailing word if it is a known color-ish token.
  const tail = t.split(" ");
  const last = tail[tail.length - 1]?.toLowerCase();
  const colorish = new Set([
    "black",
    "white",
    "silver",
    "gray",
    "grey",
    "gold",
    "blue",
    "green",
    "red",
    "purple",
    "pink",
    "midnight",
    "starlight",
    "yellow",
    "orange",
    "graphite",
    "space",
    "natural",
  ]);
  if (tail.length >= 3 && last && colorish.has(last)) {
    tail.pop();
    t = tail.join(" ");
  }
  return t;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (import bot)" },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
}

async function getAllProductUrls() {
  const xml = await fetchText("https://istore-shop116.ru/sitemap-store.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return uniq(locs);
}

function parseProductPage(url, html) {
  const $ = cheerio.load(html);
  const h1 = $("h1").first().text().trim();
  const title = h1 || $('meta[property="og:title"]').attr("content") || url;

  const lidAttr = $('[data-product-lid]').first().attr("data-product-lid");
  const lid = lidAttr ? String(lidAttr) : null;

  // Tilda price often present in data-product-price or schema.org offer price content
  const priceAttr = $('[data-product-price]').first().attr("data-product-price");
  const offerPrice = $('[itemprop="price"]').first().attr("content");
  const priceRaw = priceAttr || offerPrice || null;
  const price = priceRaw ? Math.round(Number(String(priceRaw).replace(",", "."))) : 0;

  const image = $('[itemprop="image"]').first().attr("content") || null;

  const path = new URL(url).pathname.split("/").filter(Boolean);
  const categorySlug = path[0] || "catalog";

  const baseModel = baseModelFromTitle(title);
  const { storageGb, color } = parseVariantFromTitle(title);

  return {
    url,
    lid,
    titleRaw: title,
    baseModel,
    categorySlug,
    price,
    storageGb: storageGb ?? 1, // schema requires integer not null; fallback to 1
    simType: "sim_esim", // MVP: schema requires enum; non-phone goods will still store a default
    colors: color ? [color] : [],
    image,
  };
}

async function upsertCategories(categorySlugs) {
  const rows = categorySlugs.map((slug, i) => ({
    slug,
    title: slug
      .split("-")
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
      .join(" "),
    sort_order: i + 1,
    is_hidden: false,
  }));
  const { data, error } = await sb.from("categories").upsert(rows, { onConflict: "slug" }).select("id,slug");
  if (error) throw error;
  const map = new Map(data.map((x) => [x.slug, x.id]));
  return map;
}

async function upsertProductsAndVariants(grouped, categoryIdBySlug) {
  let i = 0;
  for (const [modelKey, items] of grouped) {
    i++;
    const base = items[0];
    const productSlug = slugify(base.baseModel);
    const categoryId = categoryIdBySlug.get(base.categorySlug) || [...categoryIdBySlug.values()][0];
    const basePrice = Math.min(...items.map((x) => x.price || 0).filter((n) => n > 0));

    const { data: prod, error: prodErr } = await sb
      .from("products")
      .upsert(
        {
          slug: productSlug,
          title: base.baseModel,
          subtitle: "",
          category_id: categoryId,
          base_price: basePrice || 0,
          image_urls: [], // no images for now
          is_active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (prodErr) throw prodErr;

    // Replace variants
    const { error: delErr } = await sb.from("product_variants").delete().eq("product_id", prod.id);
    if (delErr) throw delErr;

    const variants = items.map((x) => ({
      product_id: prod.id,
      storage_gb: x.storageGb,
      sim_type: x.simType,
      colors: x.colors,
      price: x.price || basePrice || 0,
      sku: x.lid,
      in_stock: true,
    }));
    const { error: vErr } = await sb.from("product_variants").insert(variants);
    if (vErr) throw vErr;

    if (i % 25 === 0) console.log(`Imported ${i}/${grouped.size}: ${base.baseModel}`);
  }
}

async function main() {
  const urls = await getAllProductUrls();
  console.log("product_urls", urls.length);

  // Fetch & parse with simple concurrency
  const concurrency = 8;
  const out = [];
  let idx = 0;
  async function worker() {
    while (idx < urls.length) {
      const my = idx++;
      const url = urls[my];
      try {
        const html = await fetchText(url);
        out.push(parseProductPage(url, html));
      } catch (e) {
        console.error("fail", url, e?.message || e);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Group by base model + category (so same name across categories won't merge incorrectly)
  const grouped = new Map();
  for (const p of out) {
    const key = `${p.categorySlug}::${p.baseModel}`;
    const arr = grouped.get(key) || [];
    arr.push(p);
    grouped.set(key, arr);
  }

  // ensure categories exist
  const categorySlugs = uniq(out.map((x) => x.categorySlug));
  const categoryIdBySlug = await upsertCategories(categorySlugs);

  await upsertProductsAndVariants(grouped, categoryIdBySlug);
  console.log("DONE products", grouped.size, "variants", out.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

