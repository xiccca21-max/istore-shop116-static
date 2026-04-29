/**
 * Одноразово: категория iMac + CDN-картинки для импортированных Mac/iMac.
 * Запуск: node --env-file=.env.local scripts/apply-imac-category-and-images.mjs
 */
import crypto from "node:crypto";

const u = process.env.SUPABASE_URL.replace(/\/$/, "");
const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE =
  "https://cdn.jsdelivr.net/gh/xiccca21-max/istore-images-cdn@master/uploads/2026-04-30";

async function patchProduct(slug, body) {
  const r = await fetch(`${u}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: {
      apikey: k,
      Authorization: `Bearer ${k}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${slug} PATCH ${r.status}: ${t}`);
}

async function main() {
  const catId = crypto.randomUUID();

  const ins = await fetch(`${u}/rest/v1/categories`, {
    method: "POST",
    headers: {
      apikey: k,
      Authorization: `Bearer ${k}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: catId,
      slug: "imac",
      title: "iMac",
      image_url: `${BASE}/0262_categories_imac.png`,
      sort_order: 4,
      is_hidden: false,
    }),
  });
  const it = await ins.text();
  if (!ins.ok) throw new Error(`categories POST ${ins.status}: ${it}`);
  console.log("created category imac", catId);

  await patchProduct("apple-mac-mini-m4-16-256", {
    image_urls: [`${BASE}/0263_products_apple-mac-mini-m4-16-256.jpeg`],
  });
  await patchProduct("apple-mac-mini-m4-pro-24-512", {
    image_urls: [`${BASE}/0264_products_apple-mac-mini-m4-pro-24-512.jpeg`],
  });
  await patchProduct("apple-imac-24-retina-4k-16-1tb-roste", {
    category_id: catId,
    image_urls: [`${BASE}/0265_products_apple-imac-24-retina-4k-16-1tb-roste.jpeg`],
  });
  await patchProduct("apple-imac-24-retina-4k-16-512-roste", {
    category_id: catId,
    image_urls: [`${BASE}/0266_products_apple-imac-24-retina-4k-16-512-roste.png`],
  });

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
