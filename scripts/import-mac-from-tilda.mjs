/**
 * Одноразовый импорт товаров со страницы Tilda https://istore-shop116.ru/mac
 * Запуск: node --env-file=.env.local scripts/import-mac-from-tilda.mjs
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "image-import", "mac-tilda-originals");

const MAC_CATEGORY_ID = "2b7e62a9-e783-46e2-ba0a-0bc867dbaca1";

/** Спарсено из HTML (блок t754); картинки — data-original на static.tildacdn.com */
const ITEMS = [
  {
    slug: "apple-mac-mini-m4-16-256",
    title: "Apple Mac mini M4 16/256",
    price: 74990,
    storageGb: 256,
    imageUrl: "https://static.tildacdn.com/tild6565-6661-4661-a261-653130386431/414EF47B-0E57-4502-A.jpeg",
  },
  {
    slug: "apple-mac-mini-m4-pro-24-512",
    title: "Apple Mac mini M4 Pro 24/512",
    price: 144990,
    storageGb: 512,
    imageUrl: "https://static.tildacdn.com/tild6565-6661-4661-a261-653130386431/414EF47B-0E57-4502-A.jpeg",
  },
  {
    slug: "apple-imac-24-retina-4k-16-1tb-roste",
    title: "Apple iMac 24 Retina 4k 10CPU/10GPU 16/1Tb Ростест",
    price: 209990,
    storageGb: 1024,
    imageUrl: "https://static.tildacdn.com/tild3031-3838-4165-b662-313832626338/4BDCE4E0-48F7-4B72-8.jpeg",
  },
  {
    slug: "apple-imac-24-retina-4k-16-512-roste",
    title: "Apple iMac 24 Retina 4k 10CPU/10GPU 16/512 Ростест",
    price: 179990,
    storageGb: 512,
    imageUrl: "https://static.tildacdn.com/tild3031-3838-4165-b662-313832626338/4BDCE4E0-48F7-4B72-8.jpeg",
  },
];

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; iStoreImport/1.0)" },
  });
  if (!res.ok) throw new Error(`GET image ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  const sb = createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const report = [];

  for (const item of ITEMS) {
    const { data: existing } = await sb.from("products").select("id,slug").eq("slug", item.slug).maybeSingle();
    if (existing) {
      report.push({ slug: item.slug, status: "skip_exists", id: existing.id });
      const ext = path.extname(new URL(item.imageUrl).pathname) || ".jpeg";
      const localPath = path.join(OUT_DIR, `${item.slug}${ext}`);
      try {
        const n = await downloadImage(item.imageUrl, localPath);
        report[report.length - 1].downloadedBytes = n;
        report[report.length - 1].localFile = localPath;
      } catch (e) {
        report[report.length - 1].downloadError = String(e);
      }
      continue;
    }

    const productId = crypto.randomUUID();
    const variantId = crypto.randomUUID();

    const { error: pe } = await sb.from("products").insert({
      id: productId,
      slug: item.slug,
      title: item.title,
      subtitle: "Импорт с istore-shop116.ru/mac",
      category_id: MAC_CATEGORY_ID,
      base_price: item.price,
      image_urls: [],
      card_colors: [],
      characteristics_text: "",
      is_active: true,
    });
    if (pe) {
      report.push({ slug: item.slug, status: "error_product", error: pe.message });
      continue;
    }

    const { error: ve } = await sb.from("product_variants").insert({
      id: variantId,
      product_id: productId,
      storage_gb: item.storageGb,
      sim_type: "sim",
      colors: [],
      price: item.price,
      sku: null,
      in_stock: true,
    });
    if (ve) {
      report.push({ slug: item.slug, status: "error_variant", error: ve.message, productId });
      continue;
    }

    const ext = path.extname(new URL(item.imageUrl).pathname) || ".jpeg";
    const localPath = path.join(OUT_DIR, `${item.slug}${ext}`);
    let bytes = 0;
    try {
      bytes = await downloadImage(item.imageUrl, localPath);
    } catch (e) {
      report.push({
        slug: item.slug,
        status: "ok_no_download",
        productId,
        variantId,
        downloadError: String(e),
      });
      continue;
    }

    report.push({
      slug: item.slug,
      status: "ok",
      productId,
      variantId,
      localFile: localPath,
      downloadedBytes: bytes,
    });
  }

  console.log(JSON.stringify({ outDir: OUT_DIR, report }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
