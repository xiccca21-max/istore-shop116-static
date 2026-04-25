const url =
  process.argv[2] ||
  "https://istore-shop116.ru/appleiphone16iphone14iphone13/tproduct/1904247041-715397677961-apple-iphone-15-128gb-black";

const html = await fetch(url).then((r) => r.text());
console.log("len", html.length);

const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
console.log("h1", h1 ? String(h1[1]).replace(/<[^>]+>/g, "").trim().slice(0, 160) : "none");

const og = html.match(/property="og:title"\s+content="([^"]+)"/i);
console.log("og", og ? og[1] : "none");

const tProd = html.match(/t_product\s*=\s*(\{[\s\S]*?\});/);
console.log("t_product", Boolean(tProd), tProd ? tProd[1].slice(0, 200) : "");

const ldJson = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
console.log("ldjson", Boolean(ldJson), ldJson ? ldJson[1].slice(0, 200) : "");

const lid = html.match(/data-product-lid="(\d+)"/i) || html.match(/"product_lid"\s*:\s*"(\d+)"/i);
console.log("product_lid", lid ? lid[1] : "none");

const price = html.match(/data-product-price="([^"]+)"/i) || html.match(/"price"\s*:\s*"([^"]+)"/i);
console.log("price_hint", price ? price[1] : "none");

const opts = [
  "tcart",
  "tilda",
  "t-store",
  "t-store__prod",
  "t_store",
  "tstore",
  "product_lid",
  "product_uid",
  "sku",
  "price",
  "option",
];
for (const k of opts) {
  const c = (html.match(new RegExp(k, "gi")) || []).length;
  if (c) console.log("hit", k, c);
}

