import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

const TITLE_OVERRIDES = {
  appleiphone16iphone14iphone13: "iPhone 13–16",
  appleiphone16iphone16e: "iPhone 16 / 16e",
  appleiphone16plus: "iPhone 16 Plus",
  appleiphone17: "iPhone 17",
  appleiphone17promax: "iPhone 17 Pro Max",
  appleiphone16promax16pro: "iPhone 16 Pro / Pro Max",
  appleiphoneair: "iPhone Air",
  airpods: "AirPods",
  "air-pods": "AirPods",
  applewatch: "Apple Watch",
  "apple-watch": "Apple Watch",
  macbook: "MacBook",
  mac: "Mac",
  ipad: "iPad",
  samsung: "Samsung",
  dyson: "Dyson",
  google: "Google",
  steam: "Steam / Игровые консоли",
  "canon-gopro-insta": "Фото/экшн-камеры",
  marshalls: "Marshall",
  tproduct: "Другое",
};

function smartTitleFromSlug(slug) {
  const s = String(slug);

  // Keep obvious ones
  if (s === "iphone") return "iPhone";
  if (["ipad", "dyson", "samsung", "google", "steam"].includes(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Split kebab-case
  if (s.includes("-")) {
    return s
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Try to insert spaces between known tokens
  let t = s;
  const tokens = [
    "appleiphone",
    "iphone",
    "applewatch",
    "watch",
    "macbook",
    "mac",
    "airpods",
    "dyson",
    "samsung",
    "google",
    "steam",
    "canon",
    "gopro",
    "insta",
    "marshall",
    "plus",
    "pro",
    "promax",
    "max",
    "air",
    "ultra",
    "se",
    "e",
  ];
  for (const tok of tokens) {
    t = t.replaceAll(tok, ` ${tok} `);
  }
  t = t.replace(/\s+/g, " ").trim();

  // Normalize Apple iPhone token
  t = t.replace(/\bappleiphone\b/i, "iPhone");
  t = t.replace(/\biphone\b/i, "iPhone");
  t = t.replace(/\bairpods\b/i, "AirPods");
  t = t.replace(/\bapplewatch\b/i, "Apple Watch");
  t = t.replace(/\bmacbook\b/i, "MacBook");
  t = t.replace(/\bmac\b/i, "Mac");
  t = t.replace(/\bpromax\b/i, "Pro Max");
  t = t.replace(/\bpro\b/i, "Pro");
  t = t.replace(/\bplus\b/i, "Plus");
  t = t.replace(/\bultra\b/i, "Ultra");
  t = t.replace(/\bse\b/i, "SE");

  // Separate digits from letters
  t = t.replace(/([a-zа-яё])(\d)/gi, "$1 $2");
  t = t.replace(/(\d)([a-zа-яё])/gi, "$1 $2");

  // Title case words, but keep iPhone/iPad/AirPods/MacBook/Apple
  const keep = new Set(["iPhone", "iPad", "AirPods", "MacBook", "Mac", "Apple", "Watch", "Pro", "Max", "Plus", "Ultra", "SE"]);
  t = t
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const ww = w;
      const cap = ww.charAt(0).toUpperCase() + ww.slice(1).toLowerCase();
      if (keep.has(ww)) return ww;
      if (keep.has(cap)) return cap;
      if (/^\d+$/.test(ww)) return ww;
      return cap;
    })
    .join(" ");

  return t || s;
}

async function main() {
  const { data, error } = await sb.from("categories").select("id,slug,title").order("created_at", { ascending: true });
  if (error) throw error;

  let changed = 0;
  for (const c of data || []) {
    const next = TITLE_OVERRIDES[c.slug] || smartTitleFromSlug(c.slug);
    if (next && next !== c.title) {
      const { error: upErr } = await sb.from("categories").update({ title: next }).eq("id", c.id);
      if (upErr) throw upErr;
      changed++;
    }
  }

  console.log("categories_total", (data || []).length);
  console.log("updated", changed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

