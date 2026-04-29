/**
 * One-off: split former "Игровые приставки" into Sony PlayStation + new Игровые приставки.
 * Safe to re-run only if DB is still in pre-split state (checks slug of known category id).
 */
import fs from "fs";
import crypto from "crypto";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (n) => (env.match(new RegExp("^" + n + "=(.*)$", "m")) || [])[1]?.trim() || "";
const base = get("SUPABASE_URL").replace(/\/$/, "");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
const headers = {
  apikey: key,
  authorization: "Bearer " + key,
  "content-type": "application/json",
  prefer: "return=representation",
};

const OLD_CAT = "23f97128-1564-4f91-8f5e-1956cfa377d0";

const pre = await fetch(base + "/rest/v1/categories?select=slug&id=eq." + OLD_CAT, {
  headers: { apikey: key, authorization: "Bearer " + key },
});
const preRow = (await pre.json())[0];
if (preRow?.slug === "sony-playstation") {
  console.log("Already split (Sony category slug set). Exit.");
  process.exit(0);
}

const newId = crypto.randomUUID();
const newSlug = "igrovye-pristavki";
const imagePath = "/assets/category-igrovye-pristavki.png";
const moveSlugs = ["nintendo-switch-2-mario", "nintendo-switch-2", "steam-deck-oled"];

async function req(method, path, body) {
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(method + " " + path + " " + r.status + " " + t);
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

await req("PATCH", "/rest/v1/categories?id=eq." + OLD_CAT, {
  slug: "sony-playstation",
  title: "Sony PlayStation",
  sort_order: 9,
});

const inserted = await req("POST", "/rest/v1/categories", [
  { id: newId, slug: newSlug, title: "Игровые приставки", image_url: imagePath, sort_order: 8, is_hidden: false },
]);
console.log("inserted", inserted);

const inList = "(" + moveSlugs.map((s) => `"${s}"`).join(",") + ")";
const r = await fetch(base + "/rest/v1/products?select=id,slug&slug=in." + inList, {
  headers: { apikey: key, authorization: "Bearer " + key },
});
const prods = await r.json();
if (!Array.isArray(prods)) throw new Error("bad products response");
for (const p of prods) {
  await req("PATCH", "/rest/v1/products?id=eq." + p.id, { category_id: newId });
  console.log("moved", p.slug);
}
console.log("OK new_category_id=", newId);
