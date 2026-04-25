import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

export type EtalonHeroSlide = { title: string; imageUrl: string | null; sortOrder: number };

function titleFromSrc(src: string, fallback: string) {
  const s = (src || "").trim();
  if (!s) return fallback;
  const name = s.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || "";
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  return base ? `Hero: ${base}` : fallback;
}

export function readEtalonHeroSlidesFromWww(): EtalonHeroSlide[] {
  const htmlPath = path.join(process.cwd(), "www", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);
  const slides: EtalonHeroSlide[] = [];
  $("[data-hero] .hero-slide").each((i, el) => {
    const img = $(el).find("img").first();
    const src = (img.attr("src") || "").trim();
    const alt = (img.attr("alt") || "").trim();
    const title = alt || titleFromSrc(src, `Hero slide ${i + 1}`);
    slides.push({ title, imageUrl: src || null, sortOrder: i + 1 });
  });
  return slides;
}

