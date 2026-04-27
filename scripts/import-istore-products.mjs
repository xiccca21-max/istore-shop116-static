import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INPUT_JSON = process.env.TILDA_PRODUCTS_JSON || path.resolve(process.cwd(), "tilda-parser/output/products.json");
const REPORT_JSON = process.env.TILDA_IMPORT_REPORT || path.resolve(process.cwd(), "tilda-parser/output/import-report.json");
const FALLBACK_CATEGORY_SLUG = process.env.TILDA_FALLBACK_CATEGORY || "aksessuary";
const NETWORK_RETRIES = Number(process.env.TILDA_IMPORT_NETWORK_RETRIES || 5);
const NETWORK_RETRY_DELAY_MS = Number(process.env.TILDA_IMPORT_RETRY_DELAY_MS || 1200);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, retries = NETWORK_RETRIES) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (result?.error) throw result.error;
      return result;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      const delay = NETWORK_RETRY_DELAY_MS * (attempt + 1);
      console.warn(`[import] ${label} retry ${attempt + 1}/${retries} after ${delay}ms: ${error?.message || error}`);
      await wait(delay);
    }
  }
  throw lastError;
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

function toInt(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : fallback;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function prettifySlug(slug) {
  const m = {
    iphone: "iPhone",
    "air-pods": "AirPods",
    macbook: "MacBook",
    "apple-watch": "Apple Watch",
    ipad: "iPad",
    samsung: "Samsung",
    dyson: "Dyson",
    aksessuary: "Аксессуары",
  };
  return m[slug] || slug.split("-").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ");
}

const aliasMap = {
  airpods: "air-pods",
  applewatch: "apple-watch",
  macbook: "macbook",
  ipad: "ipad",
  samsung: "samsung",
  dyson: "dyson",
};

function mapCategoryAlias(alias) {
  const a = String(alias || "").trim().toLowerCase();
  if (!a) return FALLBACK_CATEGORY_SLUG;
  if (a in aliasMap) return aliasMap[a];
  if (a.startsWith("appleiphone")) return "iphone";
  return FALLBACK_CATEGORY_SLUG;
}

function detectSimType(title = "", description = "") {
  const t = `${title} ${description}`.toLowerCase();
  const hasEsim = /\besim\b/.test(t);
  const hasSim = /\b(sim|nano sim)\b/.test(t);
  if (hasEsim && hasSim) return "sim_esim";
  if (hasEsim) return "esim";
  if (hasSim) return "sim";
  return "sim_esim";
}

function parseStorageGb(title = "") {
  const t = String(title);
  const tb = t.match(/\b(\d{1,2})\s*(?:tb|тб)\b/i);
  if (tb) return Number(tb[1]) * 1024;
  const gb = t.match(/\b(\d{2,5})\s*(?:gb|гб)\b/i);
  if (gb) return Number(gb[1]);
  const ramStorage = t.match(/\b(\d{1,2})\s*\/\s*(\d{2,5})\b/);
  if (ramStorage) return Number(ramStorage[2]);
  return 1;
}

const colorTokens = [
  "black",
  "jet black",
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
  "space black",
  "natural",
  "teal",
  "ultramarine",
  "desert titanium",
  "titanium",
  "blue titanium",
  "black titanium",
  "white titanium",
];

function parseColor(title = "") {
  const t = String(title).trim();
  const lower = t.toLowerCase();
  for (const c of colorTokens.sort((a, b) => b.length - a.length)) {
    if (lower.endsWith(` ${c}`) || lower === c) return c;
  }
  const marker = t.match(/\b(?:gb|гб|tb|тб)\b/i);
  if (marker) {
    const tail = t.slice((marker.index || 0) + marker[0].length).replace(/^[\s,.-]+/, "").trim();
    if (tail && tail.length <= 48) return tail;
  }
  return null;
}

function normalizeModelTitle(rawTitle = "") {
  let t = String(rawTitle || "").trim();
  t = t.replace(/\b\d{1,2}\s*\/\s*\d{2,5}\b/gi, "");
  t = t.replace(/\b\d{1,2}\s*(?:tb|тб)\b/gi, "");
  t = t.replace(/\b\d{2,5}\s*(?:gb|гб)\b/gi, "");
  t = t.replace(/\besim\b/gi, "");
  t = t.replace(/\bnano\s*sim\b/gi, "");
  t = t.replace(/\bsim\b/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim();

  const color = parseColor(t);
  if (color) {
    const re = new RegExp(`${color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    t = t.replace(re, "").replace(/[\s,.-]+$/, "").trim();
  }
  return t || String(rawTitle || "").trim();
}

function buildVariantFromItem(item) {
  const title = String(item?.title || "").trim();
  const description = String(item?.description_text || "").trim();
  const storageGb = parseStorageGb(title);
  const simType = detectSimType(title, description);
  const color = parseColor(title);
  const imageUrl = Array.isArray(item?.images) && item.images[0] ? String(item.images[0]).trim() : null;
  const price = toInt(item?.price, 0);
  const sku = item?.lid ? String(item.lid) : null;
  return {
    storageGb: storageGb > 0 ? storageGb : 1,
    simType,
    colors: color ? [color] : [],
    imageUrl,
    price: price >= 0 ? price : 0,
    sku,
    inStock: true,
  };
}

async function readInput() {
  const text = await fs.readFile(INPUT_JSON, "utf-8");
  const json = JSON.parse(text);
  if (!Array.isArray(json)) throw new Error("Input JSON must be array");
  return json;
}

async function ensureCategories(usedSlugs) {
  const { data: existing } = await withRetry("select categories", () => sb.from("categories").select("id,slug,sort_order"));
  const bySlug = new Map((existing || []).map((r) => [r.slug, r]));
  const maxSort = Math.max(0, ...(existing || []).map((r) => Number(r.sort_order || 0)));

  const toCreate = [];
  let nextSort = maxSort + 1;
  for (const slug of usedSlugs) {
    if (bySlug.has(slug)) continue;
    toCreate.push({ slug, title: prettifySlug(slug), sort_order: nextSort++, is_hidden: false });
  }
  if (toCreate.length) {
    await withRetry("insert categories", () => sb.from("categories").insert(toCreate));
  }
  const { data: after } = await withRetry("reselect categories", () => sb.from("categories").select("id,slug"));
  return new Map((after || []).map((r) => [r.slug, r.id]));
}

async function clearCatalogForReplace() {
  // Keep order headers, but clear item links so product variants can be safely replaced.
  await withRetry("delete order_items", () =>
    sb.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
  );

  await withRetry("delete featured", () =>
    sb.from("homepage_featured_products").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
  );

  await withRetry("delete variants", () =>
    sb.from("product_variants").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
  );

  await withRetry("delete products", () =>
    sb.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
  );
}

function groupProducts(raw, report) {
  const grouped = new Map();
  for (const item of raw) {
    const titleRaw = String(item?.title || "").trim();
    if (!titleRaw) continue;

    const mappedCategorySlug = mapCategoryAlias(item?.category_alias);
    if (mappedCategorySlug === FALLBACK_CATEGORY_SLUG && String(item?.category_alias || "").trim().toLowerCase() !== FALLBACK_CATEGORY_SLUG) {
      report.unmappedAliases[item?.category_alias || ""] = (report.unmappedAliases[item?.category_alias || ""] || 0) + 1;
    }

    const modelTitle = normalizeModelTitle(titleRaw);
    const productSlug = slugify(modelTitle);
    if (modelTitle !== titleRaw) {
      report.normalizedTitles.push({ from: titleRaw, to: modelTitle });
    }
    const key = `${mappedCategorySlug}::${productSlug}`;
    const variant = buildVariantFromItem(item);
    const image = Array.isArray(item?.images) && item.images[0] ? String(item.images[0]).trim() : null;

    if (!grouped.has(key)) {
      grouped.set(key, {
        categorySlug: mappedCategorySlug,
        modelTitle,
        productSlug,
        subtitle: "",
        images: [],
        variants: [],
      });
    }
    const g = grouped.get(key);
    if (image) g.images.push(image);
    g.variants.push(variant);
  }

  for (const g of grouped.values()) {
    g.images = uniq(g.images);
    const seen = new Set();
    g.variants = g.variants.filter((v) => {
      const k = `${v.storageGb}|${v.simType}|${(v.colors || []).join(",")}|${v.price}|${v.sku || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // products.slug is globally unique in DB, so resolve collisions across categories.
  const bySlug = new Map();
  for (const g of grouped.values()) {
    const arr = bySlug.get(g.productSlug) || [];
    arr.push(g);
    bySlug.set(g.productSlug, arr);
  }
  for (const [slug, arr] of bySlug.entries()) {
    if (arr.length <= 1) continue;
    report.ambiguousSlugs.push({ slug, count: arr.length, categories: arr.map((x) => x.categorySlug) });
    for (const g of arr) {
      g.productSlug = `${slug}-${g.categorySlug}`;
    }
  }

  // If collisions still remain (same slug+category), append index suffix deterministically.
  const finalCounts = new Map();
  for (const g of grouped.values()) {
    const count = (finalCounts.get(g.productSlug) || 0) + 1;
    finalCounts.set(g.productSlug, count);
    if (count > 1) {
      g.productSlug = `${g.productSlug}-${count}`;
    }
  }
  return grouped;
}

async function insertCatalog(grouped, categoryIdBySlug, report) {
  const groups = Array.from(grouped.values());
  const productRows = groups.map((g) => {
    const categoryId = categoryIdBySlug.get(g.categorySlug) || categoryIdBySlug.get(FALLBACK_CATEGORY_SLUG);
    if (!categoryId) throw new Error(`Category id not found for slug=${g.categorySlug}`);
    const prices = g.variants.map((v) => Number(v.price || 0)).filter((n) => Number.isFinite(n) && n > 0);
    const basePrice = prices.length ? Math.min(...prices) : 0;
    return {
      key: `${g.categorySlug}::${g.productSlug}`,
      row: {
        slug: g.productSlug,
        title: g.modelTitle,
        subtitle: g.subtitle,
        category_id: categoryId,
        base_price: basePrice,
        image_urls: g.images,
        is_active: true,
      },
    };
  });

  // Final defensive pass: enforce unique slugs inside this import batch.
  const slugSeen = new Map();
  for (const item of productRows) {
    const base = item.row.slug;
    const n = (slugSeen.get(base) || 0) + 1;
    slugSeen.set(base, n);
    if (n > 1) {
      const fixed = `${base}-${n}`;
      report.ambiguousSlugs.push({ slug: base, fixed, reason: "batch-duplicate" });
      item.row.slug = fixed;
      const g = groups.find((x) => `${x.categorySlug}::${x.productSlug}` === item.key);
      if (g) g.productSlug = fixed;
    }
  }

  const productsChunkSize = 25;
  const variantsChunkSize = 10;
  const insertedProducts = [];
  for (let i = 0; i < productRows.length; i += productsChunkSize) {
    const chunk = productRows.slice(i, i + productsChunkSize);
    const { data } = await withRetry("upsert products chunk", () =>
      sb.from("products").upsert(chunk.map((x) => x.row), { onConflict: "slug" }).select("id,slug,category_id"),
    );
    insertedProducts.push(...(data || []));
    console.log(`[import] products inserted ${Math.min(i + chunk.length, productRows.length)}/${productRows.length}`);
  }

  const idBySlug = new Map(insertedProducts.map((r) => [r.slug, r.id]));
  let variantsInserted = 0;
  for (let i = 0; i < groups.length; i += variantsChunkSize) {
    const chunk = groups.slice(i, i + variantsChunkSize);
    const variantRows = [];
    for (const g of chunk) {
      const productId = idBySlug.get(g.productSlug);
      if (!productId) throw new Error(`Inserted product id not found for slug=${g.productSlug}`);
      for (const v of g.variants) {
        variantRows.push({
          product_id: productId,
          storage_gb: Number(v.storageGb || 1),
          sim_type: v.simType || "sim_esim",
          colors: v.colors || [],
          image_url: v.imageUrl || null,
          price: Number(v.price || 0),
          sku: v.sku || null,
          in_stock: v.inStock !== false,
        });
      }
      report.products.push({
        slug: g.productSlug,
        title: g.modelTitle,
        categorySlug: g.categorySlug,
        images: g.images.length,
        variants: g.variants.length,
      });
    }
    if (variantRows.length) {
      await withRetry("insert variants chunk", () => sb.from("product_variants").insert(variantRows));
      variantsInserted += variantRows.length;
    }
    console.log(`[import] variants inserted ${Math.min(i + chunk.length, groups.length)}/${groups.length} models`);
  }

  report.productsInserted = insertedProducts.length;
  report.variantsInserted = variantsInserted;
}

async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
  await fs.writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf-8");
}

async function main() {
  const startedAt = new Date().toISOString();
  const raw = await readInput();

  const report = {
    startedAt,
    inputJson: INPUT_JSON,
    fallbackCategorySlug: FALLBACK_CATEGORY_SLUG,
    inputCount: raw.length,
    unmappedAliases: {},
    normalizedTitles: [],
    ambiguousSlugs: [],
    productsInserted: 0,
    variantsInserted: 0,
    products: [],
  };

  const grouped = groupProducts(raw, report);
  const usedSlugs = uniq([FALLBACK_CATEGORY_SLUG, ...Array.from(grouped.values()).map((g) => g.categorySlug)]);
  const categoryIdBySlug = await ensureCategories(usedSlugs);

  await clearCatalogForReplace();
  await insertCatalog(grouped, categoryIdBySlug, report);

  report.endedAt = new Date().toISOString();
  report.groupedModels = grouped.size;
  report.categoryCountUsed = usedSlugs.length;
  report.emptyPrimaryImageVariants = report.products.reduce((acc, p) => acc + (p.images > 0 ? 0 : p.variants), 0);
  report.reportPath = REPORT_JSON;
  await writeReport(report);

  console.log(
    JSON.stringify(
      {
        ok: true,
        inputCount: report.inputCount,
        groupedModels: report.groupedModels,
        productsInserted: report.productsInserted,
        variantsInserted: report.variantsInserted,
        unmappedAliasCount: Object.keys(report.unmappedAliases).length,
        reportPath: REPORT_JSON,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

