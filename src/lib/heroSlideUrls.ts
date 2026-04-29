/**
 * Detects URLs that are clearly a banner image asset (CDN / static file),
 * not a catalog path or arbitrary landing page.
 */
export function looksLikeHeroBannerImageUrl(raw: string): boolean {
  const u = String(raw || "").trim();
  if (!u) return false;
  if (u.startsWith("/")) {
    if (/\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(u)) return true;
    if (u.startsWith("/assets/")) return true;
    return false;
  }
  try {
    const href = u.startsWith("//") ? `https:${u}` : u;
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    if (/\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(pathAndQuery)) return true;
    if (host.includes("jsdelivr.net") && parsed.pathname.includes("/uploads/")) return true;
    if (host.includes("userapi.com")) return true;
    if (host.endsWith("vk.me")) return true;
    return false;
  } catch {
    return /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(u);
  }
}

export type HeroUrlPair = { image_url: string | null; link_url: string | null };

/**
 * When legacy / mistaken data stores the picture URL in link_url and leaves image_url empty,
 * treat link_url as the image and clear the click target until the admin sets a real link.
 */
export function normalizeMisplacedHeroImageUrls(
  image_url: string | null | undefined,
  link_url: string | null | undefined,
): HeroUrlPair & { changed: boolean } {
  const img = (image_url ?? "").trim() || null;
  const lnk = (link_url ?? "").trim() || null;
  if (!img && lnk && looksLikeHeroBannerImageUrl(lnk)) {
    return { image_url: lnk, link_url: null, changed: true };
  }
  return { image_url: img, link_url: lnk, changed: false };
}
