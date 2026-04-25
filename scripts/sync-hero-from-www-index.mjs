import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function titleFromSrc(src, fallback) {
  const s = String(src || "").trim();
  if (!s) return fallback;
  const name = s.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || "";
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  return base ? `Hero: ${base}` : fallback;
}

function isMissingUnique(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return code === "42p10" || msg.includes("unique or exclusion constraint") || msg.includes("on conflict") || msg.includes("there is no unique");
}

async function main() {
  const root = process.cwd();
  const htmlPath = path.join(root, "www", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);

  const slides = $(".hero [data-hero] .hero-slide, [data-hero] .hero-slide")
    .map((i, el) => {
      const img = $(el).find("img").first();
      const src = img.attr("src") || "";
      const alt = (img.attr("alt") || "").trim();
      const title = alt || titleFromSrc(src, `Hero slide ${i + 1}`);
      if (!src) return null;
      return {
        title,
        image_url: src,
        sort_order: i + 1,
        is_active: true,
      };
    })
    .get()
    .filter(Boolean);

  if (!slides.length) throw new Error(`No hero slides found in ${htmlPath}`);

  const sb = createClient(must("SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Prefer upsert by title; fallback to replace-all when unique index isn't present.
  const tryUpsert = async (rows) => {
    return await sb.from("hero_slides").upsert(rows, { onConflict: "title" });
  };

  const up1 = await tryUpsert(slides);
  const msg1 = String(up1.error?.message || "").toLowerCase();
  const code1 = String(up1.error?.code || "").toLowerCase();

  const missingUnique = !!up1.error && (code1 === "42p10" || isMissingUnique(up1.error) || msg1.includes("there is no unique"));

  if (missingUnique) {
    // Replace-all strategy (keeps etalon as the only active set).
    const { error: delErr } = await sb.from("hero_slides").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) throw new Error(delErr.message);
    const ins1 = await sb.from("hero_slides").insert(slides);
    const insMsg = String(ins1.error?.message || "").toLowerCase();
    if (ins1.error && insMsg.includes("image_url")) {
      const withoutImage = slides.map(({ title, sort_order, is_active }) => ({ title, sort_order, is_active }));
      const ins2 = await sb.from("hero_slides").insert(withoutImage);
      if (ins2.error) throw new Error(ins2.error.message);
      console.log(`Synced ${slides.length} hero slides (replace-all, without image_url column).`);
    } else if (ins1.error) {
      throw new Error(ins1.error.message);
    } else {
      console.log(`Synced ${slides.length} hero slides (replace-all).`);
    }
  } else if (up1.error && msg1.includes("image_url")) {
    const withoutImage = slides.map(({ title, sort_order, is_active }) => ({ title, sort_order, is_active }));
    const up2 = await tryUpsert(withoutImage);
    if (up2.error && isMissingUnique(up2.error)) {
      const { error: delErr } = await sb.from("hero_slides").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delErr) throw new Error(delErr.message);
      const ins2 = await sb.from("hero_slides").insert(withoutImage);
      if (ins2.error) throw new Error(ins2.error.message);
      console.log(`Synced ${slides.length} hero slides (replace-all, without image_url column).`);
    } else if (up2.error) {
      throw new Error(up2.error.message);
    } else {
      console.log(`Synced ${slides.length} hero slides (without image_url column).`);
    }
  } else if (up1.error) {
    throw new Error(up1.error.message);
  } else {
    console.log(`Synced ${slides.length} hero slides.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

