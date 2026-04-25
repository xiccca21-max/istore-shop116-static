import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function normalizeSlugFromHref(href) {
  const m = String(href || "").match(/\/catalog\/([^/]+)\/?/i);
  if (!m) return null;
  return m[1].trim();
}

function normalizeImageSrc(src) {
  const s = String(src || "").trim();
  if (!s) return null;
  // keep absolute and root-relative as-is; it's fine for the storefront
  return s;
}

async function main() {
  const root = process.cwd();
  const htmlPath = path.join(root, "public", "catalog", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);

  const tiles = $(".catalog-grid a.catalog-tile")
    .map((i, el) => {
      const href = $(el).attr("href");
      const slug = normalizeSlugFromHref(href);
      const title = $(el).find(".catalog-tile-name").first().text().trim();
      const img = $(el).find("img").first().attr("src");
      const imageUrl = normalizeImageSrc(img);
      if (!slug || !title) return null;
      return { slug, title, image_url: imageUrl, sort_order: i + 1, is_hidden: false };
    })
    .get()
    .filter(Boolean);

  if (!tiles.length) {
    throw new Error(`No categories found in ${htmlPath}`);
  }

  const sb = createClient(must("SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Upsert by slug: catalog is the source of truth.
  const { error } = await sb.from("categories").upsert(tiles, { onConflict: "slug" });
  if (error) throw new Error(error.message);

  // Hide everything else so storefront + admin show only catalog categories.
  const allow = new Set(tiles.map((t) => t.slug));
  const { data: allCats, error: allErr } = await sb.from("categories").select("id,slug,is_hidden");
  if (allErr) throw new Error(allErr.message);
  const toHide = (allCats || [])
    .filter((c) => c && c.slug && !allow.has(c.slug))
    .map((c) => c.id);

  if (toHide.length) {
    const { error: hideErr } = await sb.from("categories").update({ is_hidden: true }).in("id", toHide);
    if (hideErr) throw new Error(hideErr.message);
  }

  console.log(`Synced ${tiles.length} categories from catalog index. Hidden ${toHide.length} extra categories.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

