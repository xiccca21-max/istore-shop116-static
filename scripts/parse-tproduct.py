import json
import re
import ssl
import sys
import urllib.request


def fetch_html(url: str) -> str:
    # Some Tilda setups are picky about "browser-like" headers.
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    # tolerate local corp proxies / odd cert chains
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        b = resp.read()
        # Tilda pages are typically utf-8, but some projects still send cp1251-ish bytes.
        for enc in ("utf-8", "utf-8-sig", "cp1251"):
            try:
                return b.decode(enc)
            except Exception:
                pass
        return b.decode("utf-8", "ignore")


def strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()


def first_match(html: str, pattern: str, flags=re.I | re.S) -> str:
    m = re.search(pattern, html, flags)
    return m.group(1) if m else ""


def parse_tproduct(url: str) -> dict:
    html = fetch_html(url)

    title = strip_tags(first_match(html, r"<h1[^>]*>(.*?)</h1>"))
    og_image = first_match(html, r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"')
    category = strip_tags(first_match(html, r'<a[^>]+class="t-store__prod-popup__title[^"]*"[^>]*>.*?</a>'))

    def money_int(s: str) -> int | None:
        s = (s or "").strip()
        if not s:
            return None
        s = s.replace("\u00A0", "").replace(" ", "").replace(",", ".")
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)", s)
        if not m:
            return None
        try:
            return int(float(m.group(1)))
        except Exception:
            return None

    # Prefer machine-readable fields / known Tilda markup.
    current_price = money_int(first_match(html, r'itemprop="price"\s+content="([^"]+)"'))
    if current_price is None:
        current_price = money_int(first_match(html, r'class="js-store-prod-price-val[^"]*"[^>]*>([^<]+)<'))

    old_price = money_int(first_match(html, r'class="js-store-prod-price-old-val[^"]*"[^>]*>([^<]+)<'))

    # Fallback: visible prices in text (rarely needed for tproduct).
    prices_raw = re.findall(r"([0-9]{1,3}(?:[\s\u00A0]?[0-9]{3})*)(?:,\d{2})?\s*р\.", html, re.I)
    prices_seen: list[int] = []
    for p in prices_raw:
        n = money_int(p)
        if n is not None and n not in prices_seen:
            prices_seen.append(n)

    badge = "Без Rustore" if "Без Rustore" in html else ""
    specs = []
    wht = first_match(html, r"\bwht\s*:\s*([^<\n]+)")
    if wht:
        specs.append(f"wht: {wht.strip()}")
    # avoid matching CSS "font-weight"
    weight = first_match(html, r"(?<!-)\bWeight\s*:\s*([^<\n]+)", flags=re.S)
    if weight:
        specs.append(f"Weight: {weight.strip()}")

    return {
        "url": url,
        "title": title,
        "category": category or "Apple",
        "ogImage": og_image,
        "price": current_price,
        "oldPrice": old_price,
        "pricesSeen": prices_seen,
        "badge": badge,
        "specs": specs,
    }


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: python scripts/parse-tproduct.py <tproduct-url>", file=sys.stderr)
        return 2
    url = argv[1]
    data = parse_tproduct(url)
    print(json.dumps(data, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

