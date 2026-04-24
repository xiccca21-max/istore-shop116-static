import html
import json
import re
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(r"c:\Users\user\Desktop\проекты\timur_project")
WWW = ROOT / "www"
DATA = WWW / "data"
ASSETS = WWW / "assets"

DONOR = {
    "address_short": "Набережные Челны, Сююмбике 21/33",
    "address_full": "Набережные Челны, ул. Сююмбике 21/33 (41/04 по комплексу), вход со стороны пр. Беляева",
    "phone": "+7 (987) 005-90-39",
    "phone_href": "tel:+79870059039",
    "service_phone": "+7 (917) 275-74-45",
    "service_phone_href": "tel:+79172757445",
    "email": "istore116shop@gmail.com",
    "hours": "10:00–20:00 ежедневно",
    "reviews_url": "https://2gis.ru/nabchelny/firm/70000001065465431/tab/reviews?m=52.394279%2C55.739588%2F16.38",
    "map_embed": "https://yandex.ru/map-widget/v1/?ll=52.394279%2C55.739588&mode=search&sll=52.394279%2C55.739588&sspn=0.01%2C0.005&text=%D0%9D%D0%B0%D0%B1%D0%B5%D1%80%D0%B5%D0%B6%D0%BD%D1%8B%D0%B5%20%D0%A7%D0%B5%D0%BB%D0%BD%D1%8B%20%D0%A1%D1%8E%D1%8E%D0%BC%D0%B1%D0%B8%D0%BA%D0%B5%2021%2F33&z=17",
}

BANNED_CATEGORY_SLUGS = {
    "labubu",
    "sistemnye-bloki",
    "kollekcionnye-figurki",
    "giftcard",
    "uslugi",
}
PLACEHOLDER_IMG = "71075e37-9ee6-4009-862e-e0bf9c82514a"
GIFT_CERT_FILE = "gift-cert.png"
CATS_PER_PAGE = 4

layout = json.loads((DATA / "layout.json").read_text(encoding="utf-8"))["data"]
categories_raw = json.loads((DATA / "categories.json").read_text(encoding="utf-8"))["data"]


def ensure_asset(uuid):
    if not uuid:
        return PLACEHOLDER_IMG
    p = ASSETS / uuid
    if p.exists():
        return uuid
    try:
        url = f"https://admin.941test.ru/assets/{uuid}"
        data = urllib.request.urlopen(url, timeout=12).read()
        p.write_bytes(data)
        return uuid
    except Exception:
        return PLACEHOLDER_IMG


def first_asset_from_description(text):
    if not text:
        return None
    m = re.search(r"/assets/([0-9a-f\-]{36})", text)
    return m.group(1) if m else None


all_top_categories = [
    c for c in categories_raw
    if c.get("category_id") is None
    and (c.get("slug") or "")
    and (c.get("title") or "")
    and (c.get("slug") or "") not in BANNED_CATEGORY_SLUGS
]
for c in all_top_categories:
    c["image"] = ensure_asset(c.get("image"))

selected = layout.get("selected_products") or []
pro = None
promax = None
for item in selected:
    t = (item.get("title") or "").lower()
    if "iphone 17 pro max" in t and promax is None:
        promax = item
    elif "iphone 17 pro" in t and "max" not in t and pro is None:
        pro = item

if not pro or not promax:
    raise SystemExit("No iPhone 17 Pro/Pro Max found in selected_products")

pro_img = ensure_asset(first_asset_from_description(pro.get("description")) or PLACEHOLDER_IMG)
promax_img = ensure_asset(first_asset_from_description(promax.get("description")) or pro_img)

products = [
    {
        "slug": "iphone-17",
        "title": "Apple iPhone 17 256Gb",
        "subtitle": "Black, черный",
        "price": "89 990 ₽",
        "image": "iphone17-local.png",
        "storage": "256 ГБ",
        "sim": "NANO SIM+ESIM",
        "colors": ["#2f3444", "#f6f7f9"],
    },
    {
        "slug": "iphone-17-air",
        "title": "Apple iPhone 17 Air 256Gb",
        "subtitle": "Silver, серебристый",
        "price": "99 990 ₽",
        "image": "iphone17air-local.png",
        "storage": "256 ГБ",
        "sim": "NANO SIM+ESIM",
        "colors": ["#f6f7f9", "#2f3444"],
    },
    {
        "slug": "iphone-17-pro",
        "title": "Apple iPhone 17 Pro 256Gb",
        "subtitle": "Cosmic Orange, оранжевый",
        "price": "99 490 ₽",
        "image": "iphone17pro-local.png",
        "storage": "256 ГБ",
        "sim": "NANO SIM+ESIM",
        "colors": ["#ff7a1a", "#2f3444", "#f6f7f9"],
    },
    {
        "slug": "iphone-17-pro-max",
        "title": "Apple iPhone 17 Pro Max 256Gb",
        "subtitle": "Deep Blue, тёмно-синий",
        "price": "110 490 ₽",
        "image": "iphone17promax-local.png",
        "storage": "256 ГБ",
        "sim": "NANO SIM+ESIM",
        "colors": ["#2f3444", "#ff7a1a"],
    },
]

CATEGORY_PRODUCTS = {"iphone": products}

reviews = [
    ("Артур А.",     "Быстро подобрали iPhone 17, все показали и спокойно объяснили разницу между моделями. Отдельное спасибо консультанту, который не пытался продать что-то ненужное и честно рассказал про плюсы каждой версии."),
    ("Алина Н.",     "Нормальный сервис, вежливые ребята, без навязчивости. Покупкой довольна, телефон пришёл в оригинальной запечатанной упаковке, всё проверили вместе. Буду рекомендовать друзьям."),
    ("Роман Т.",     "Брал iPhone 17 Pro, цена адекватная, по наличию всё как обещали. Упаковали аккуратно, приложили чек. Связь с магазином чёткая, отвечают быстро в мессенджерах."),
    ("Виктория К.",  "Понравилось, что можно сравнить модели на месте и сразу выбрать нужную память. Персонал терпеливо ответил на все вопросы, не торопили. Магазин выглядит современно и приятно."),
    ("Илья П.",      "Оформили быстро, проверили устройство при мне, всё работало из коробки. Заодно подобрали защитное стекло и чехол. В следующий раз приду уже за AirPods."),
    ("Марина Л.",    "Консультация по делу, помогли выбрать между 17 и 17 Air. Спасибо за честность — сказали, что мне именно Air зайдёт лучше. Так и вышло, в руке ощущается совсем по-другому."),
    ("Руслан М.",    "Хороший магазин, удобное расположение, приятное обслуживание. Брал iPhone сестре на день рождения, упаковали красиво и дали подарочный пакет. Остался очень доволен."),
    ("Олег Д.",      "Брал 17 Pro Max, всё оригинал, коробка и комплект в порядке. Активировали на месте, перенесли данные со старого телефона. Сервис на высоте, приятно иметь дело."),
    ("Екатерина С.", "Понравился подход: без спешки, с нормальными ответами на вопросы. Для меня смартфон — большая покупка, так что внимание важно. Всё объяснили, ничего не навязывали."),
    ("Денис В.",     "Для презентационного магазина выглядит достойно: чисто, понятно, удобно. Выбор большой, сразу видно актуальные модели. Зайду ещё за часами, если будет хорошая цена."),
]

STYLE = """
:root{--bg:#1a1a1a;--panel:#222;--panel-2:#2a2a2a;--line:#323232;--text:#f2f2f2;--muted:#a8a8a8;--accent:#ff6600;--accent-2:#ff8533;--radius:24px;--shadow:0 12px 36px rgba(0,0,0,.35)}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
button{font-family:inherit;cursor:pointer}
.page{max-width:1440px;margin:0 auto;padding:0 16px 40px}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 8px 10px;color:#cfcfcf;font-size:13px}
.topbar-left,.topbar-right{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.topbar a:hover{color:var(--accent)}
.header{position:sticky;top:8px;z-index:30;background:rgba(30,30,30,.92);backdrop-filter:blur(16px);border:1px solid var(--line);border-radius:28px;padding:10px 14px;box-shadow:var(--shadow)}
.header-row{display:flex;align-items:center;gap:14px;padding-left:170px}
.logo-slot{position:absolute;left:14px;top:10px;bottom:10px;width:150px;border:none;background:transparent;display:flex;align-items:center;justify-content:center;overflow:visible}
.logo-slot img{height:100%;width:auto;object-fit:contain;display:block}
.search{height:48px;width:clamp(260px,38vw,460px);border-radius:999px;border:1px solid #333;background:#161616;display:flex;align-items:center;gap:10px;padding:0 18px;color:#7a7a7a}
.search::before{content:"";width:16px;height:16px;border:2px solid #666;border-radius:50%;display:inline-block}
.nav{display:flex;gap:8px;overflow:auto;padding-top:10px;scrollbar-width:none}
.nav{margin-left:170px}
.nav::-webkit-scrollbar{display:none}
.nav a{padding:10px 18px;border-radius:999px;background:#1b1b1b;border:1px solid #2d2d2d;white-space:nowrap;font-size:14px;color:#d9d9d9}
.nav a:hover{background:#252525;border-color:#3a3a3a}
.nav a.active{background:var(--accent);border-color:var(--accent);color:#fff}
.nav a.catalog-link{background:var(--accent);border-color:var(--accent);color:#fff}
.section{margin-top:28px}
.section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:16px}
.section-title{margin:0;font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-.5px}
.section-link{color:var(--accent);font-weight:600}
.section-controls{display:flex;align-items:center;gap:12px}
.muted{color:var(--muted)}
.breadcrumbs{margin:18px 4px 8px;color:var(--muted);font-size:13px}
.breadcrumbs a{color:var(--muted)}.breadcrumbs a:hover{color:var(--accent)}
.breadcrumbs span.sep{margin:0 6px;color:#444}
.promo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.promo-card{display:grid;grid-template-columns:1.2fr 1fr;background:var(--panel);border-radius:24px;overflow:hidden;min-height:240px;border:1px solid #2d2d2d;box-shadow:var(--shadow)}
.promo-content{padding:24px 24px 18px;color:var(--text);display:flex;flex-direction:column}
.promo-title{font-size:34px;line-height:1.02;font-weight:800;margin:0 0 12px}
.promo-text{font-size:17px;line-height:1.35;color:var(--muted);margin:0 0 20px}
.promo-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:var(--accent);color:#fff;font-weight:700;font-size:14px;border:none}
.promo-btn:hover{background:var(--accent-2)}
.promo-image{display:flex;align-items:end;justify-content:end;background:#1b1b1b}
.promo-image img{width:100%;height:100%;object-fit:cover}

.hero{position:relative;background:linear-gradient(145deg,#1f1f1f,#262626);border:1px solid #2c2c2c;border-radius:30px;overflow:hidden;box-shadow:var(--shadow);height:240px}
.hero-slides{position:relative;height:100%}
.hero-slide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;opacity:0;transition:opacity .7s ease;padding:0 80px}
.hero-slide.is-active{opacity:1}
.hero-slide h2{margin:0;font-size:64px;font-weight:800;letter-spacing:-1.5px;background:linear-gradient(120deg,#fff,#ffb980);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-arrow{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:1px solid #3a3a3a;background:rgba(0,0,0,.5);color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center}
.hero-arrow:hover{background:var(--accent);border-color:var(--accent)}
.hero-arrow.prev{left:18px}.hero-arrow.next{right:18px}
.hero-dots{position:absolute;bottom:16px;left:0;right:0;display:flex;gap:8px;justify-content:center}
.hero-dot{width:8px;height:8px;border-radius:50%;background:#555;border:none;padding:0}
.hero-dot.is-active{background:var(--accent);width:24px;border-radius:4px}

.cats-carousel{position:relative}
.cats-viewport{overflow:hidden;border-radius:24px}
.cats-track{display:flex;transition:transform .55s ease;will-change:transform}
.cats-page{min-width:100%;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:2px}
.cats-page-mobile{display:none}
.cat-card{background:var(--panel);border:1px solid #2e2e2e;border-radius:22px;padding:18px;box-shadow:var(--shadow);transition:transform .2s,border-color .2s;display:block}
.cat-card:hover{transform:translateY(-3px);border-color:var(--accent)}
.cat-card img{height:130px;width:100%;object-fit:contain;margin-bottom:14px}
.cat-card-name{font-size:20px;font-weight:700;line-height:1.2;text-align:center}
.cats-arrow{width:40px;height:40px;border-radius:50%;border:1px solid #3a3a3a;background:#1a1a1a;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s}
.cats-arrow:hover{background:var(--accent);border-color:var(--accent)}
.cats-arrow:disabled{opacity:.35;cursor:default}
.cats-dots{display:flex;gap:8px;justify-content:center;margin-top:14px}
.cats-dot{width:8px;height:8px;border-radius:50%;background:#3a3a3a;border:none;padding:0}
.cats-dot.is-active{background:var(--accent);width:22px;border-radius:4px}
.cats-dots-mobile{display:none}

.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.buyers-carousel{position:relative}
.buyers-viewport{overflow:hidden;border-radius:24px}
.buyers-track{display:flex;transition:transform .55s ease;will-change:transform}
.buyers-page{min-width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:2px}
.buyers-page-mobile{display:none}
.buyers-arrow{width:40px;height:40px;border-radius:50%;border:1px solid #3a3a3a;background:#1a1a1a;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s}
.buyers-arrow:hover{background:var(--accent);border-color:var(--accent)}
.buyers-arrow:disabled{opacity:.35;cursor:default}
.buyers-dots{display:flex;gap:8px;justify-content:center;margin-top:14px}
.buyers-dot{width:8px;height:8px;border-radius:50%;background:#3a3a3a;border:none;padding:0}
.buyers-dot.is-active{background:var(--accent);width:22px;border-radius:4px}
.buyers-dots-mobile{display:none}
.product-card{background:var(--panel);border:1px solid #2d2d2d;border-radius:24px;overflow:hidden;box-shadow:var(--shadow);transition:border-color .2s}
.product-card:hover{border-color:var(--accent)}
.product-media{height:260px;background:#181818;padding:20px;display:flex;align-items:center;justify-content:center}
.product-media img{height:100%;width:100%;object-fit:contain}
.product-body{padding:16px 18px 20px}
.product-title{font-size:20px;font-weight:700;margin-bottom:6px;line-height:1.2}
.product-sub{font-size:13px;color:var(--muted);margin-bottom:14px}
.product-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.meta-chip{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:#efefef;border:1px solid #dfdfdf;color:#7d7d7d;font-size:11px;font-weight:700;letter-spacing:.2px}
.color-dots{display:flex;gap:6px;align-items:center;margin-bottom:10px}
.color-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.18)}
.price{font-size:26px;font-weight:800;color:var(--accent);letter-spacing:-.3px;margin-top:2px}

.catalog-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.catalog-tile{background:var(--panel);border:1px solid #2d2d2d;border-radius:26px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;gap:18px;box-shadow:var(--shadow);transition:transform .2s,border-color .2s;min-height:260px}
.catalog-tile:hover{transform:translateY(-4px);border-color:var(--accent)}
.catalog-tile-img{height:160px;width:100%;display:flex;align-items:center;justify-content:center}
.catalog-tile-img img{max-height:100%;max-width:100%;object-fit:contain}
.catalog-tile-name{font-size:22px;font-weight:700;text-align:center}
.empty-state{background:var(--panel);border:1px dashed #3a3a3a;border-radius:24px;padding:60px 24px;text-align:center;color:var(--muted);font-size:18px}

.gift{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;align-items:center;background:var(--panel);border:1px solid #2d2d2d;border-radius:30px;padding:30px;box-shadow:var(--shadow)}
.gift h2{margin:0 0 14px;font-size:36px;font-weight:800;letter-spacing:-.5px}
.gift p{margin:0 0 10px;color:#d8d8d8;line-height:1.6;font-size:16px}
.gift-img{border-radius:20px;overflow:hidden;background:#0f0f0f}
.gift-img img{width:100%;height:100%;object-fit:cover;max-height:340px}
.gift .promo-btn{margin-top:12px}

.reviews{background:var(--panel);border:1px solid #2d2d2d;border-radius:30px;padding:28px;box-shadow:var(--shadow)}
.reviews-head{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:24px}
.reviews-head .brand{display:flex;align-items:center;gap:12px}
.reviews-head img.brand-logo{width:96px;height:auto}
.rating{font-size:42px;font-weight:800;line-height:1}
.stars{font-size:22px;letter-spacing:3px;color:#fff}
.review-controls{display:flex;align-items:center;gap:8px;margin-left:auto}
.reviews-head .to-2gis{background:var(--accent);color:#fff;padding:10px 18px;border-radius:999px;font-weight:700;font-size:14px}
.reviews-head .to-2gis:hover{background:var(--accent-2)}
.review-slider{display:block}
.review-viewport{flex:1;overflow:hidden;border-radius:20px}
.review-track{display:flex;transition:transform .6s ease;will-change:transform}
.review-track-mobile{display:none}
.review-slide{min-width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:2px}
.review-card{background:#191919;border:1px solid #2d2d2d;border-radius:18px;padding:26px;min-height:260px;display:flex;flex-direction:column}
.review-author{font-weight:700;margin-bottom:6px;font-size:17px}
.review-date{color:var(--muted);font-size:12px;margin-bottom:14px}
.review-card p{margin:0;color:#d6d6d6;line-height:1.6;font-size:15px;flex:1}
.review-arrow{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid #3a3a3a;background:#1a1a1a;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;align-self:center;transition:background .2s,border-color .2s}
.review-arrow:hover{background:var(--accent);border-color:var(--accent)}
.review-dots{display:flex;gap:8px;justify-content:center;margin-top:18px}
.review-dot{width:8px;height:8px;border-radius:50%;background:#3a3a3a;border:none;padding:0}
.review-dot.is-active{background:var(--accent);width:22px;border-radius:4px}
.review-dots-mobile{display:none}

.contacts{display:grid;grid-template-columns:1fr 1.2fr;gap:24px;background:var(--panel);border:1px solid #2d2d2d;border-radius:30px;padding:26px;box-shadow:var(--shadow)}
.contacts h2{margin:0 0 18px;font-size:32px;font-weight:800;letter-spacing:-.5px}
.contacts-info p{margin:0 0 10px;color:#d8d8d8;line-height:1.5}
.contacts-info .label{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.contacts-info a{color:var(--accent)}
.contacts-info .row{margin-bottom:16px}
.contacts-map{border-radius:20px;overflow:hidden;min-height:340px;background:#0e0e0e}
.contacts-map iframe{width:100%;height:100%;min-height:340px;border:0;display:block;filter:grayscale(.2) contrast(1.05)}

.footer{margin-top:40px;background:#141414;border:1px solid #222;border-radius:30px;padding:30px 32px}
.footer-grid{display:grid;grid-template-columns:1.3fr .9fr .9fr;gap:28px}
.footer h3{margin:0 0 14px;font-size:18px;font-weight:700;color:#fff}
.footer p,.footer a{color:#bfbfbf;line-height:1.7;font-size:14px}
.footer a:hover{color:var(--accent)}
.footer-copy{margin-top:24px;padding-top:18px;border-top:1px solid #242424;color:#7b7b7b;font-size:12px}

@media (max-width:1150px){
  .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .catalog-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .promo-grid{grid-template-columns:1fr}
  .gift,.contacts{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr 1fr}
  .cats-page{grid-template-columns:repeat(2,1fr)}
  .review-card{min-height:220px}
  .hero-slide h2{font-size:46px}
}
@media (max-width:760px){
  .topbar{display:none}
  .header-row{display:grid;grid-template-columns:1fr auto}
  .logo-slot{display:none}
  .search{grid-column:1/-1;width:100%}
  .nav{margin-left:0}
  .grid{grid-template-columns:1fr}
  .buyers-page-desktop{display:none}
  .buyers-page-mobile{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  .buyers-dots-desktop{display:none}
  .buyers-dots-mobile{display:flex}
  .catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .section-title{font-size:26px}
  .section-controls{gap:8px}
  .section-link{font-size:13px}
  .cats-page-desktop{display:none}
  .cats-page-mobile{display:grid;grid-template-columns:repeat(2,1fr)}
  .cats-dots-desktop{display:none}
  .cats-dots-mobile{display:flex}
  .review-track-desktop{display:none}
  .review-track-mobile{display:flex}
  .review-slide{grid-template-columns:1fr}
  .review-dots-desktop{display:none}
  .review-dots-mobile{display:flex}
  .promo-card{grid-template-columns:1fr}
  .promo-title{font-size:28px}
  .promo-text{font-size:15px}
  .footer-grid{grid-template-columns:1fr}
  .hero{height:190px}
  .hero-slide h2{font-size:32px}
  .hero-arrow{display:none}
  .cats-arrow,.review-arrow{width:36px;height:36px;font-size:18px}
  .reviews-head{align-items:flex-start}
  .review-controls{order:2;margin-left:0}
  .reviews-head .to-2gis{order:3}
}
"""

HERO_SLIDES = ["Новинки", "Специальное предложение", "Лучший подарок"]

HERO_JS = """
(function(){
  const root=document.querySelector('[data-hero]');
  if(!root)return;
  const slides=root.querySelectorAll('.hero-slide');
  const dots=root.querySelectorAll('.hero-dot');
  let i=0,timer;
  function go(n){i=(n+slides.length)%slides.length;slides.forEach((s,idx)=>s.classList.toggle('is-active',idx===i));dots.forEach((d,idx)=>d.classList.toggle('is-active',idx===i));}
  function next(){go(i+1)}
  function prev(){go(i-1)}
  function start(){timer=setInterval(next,4500)}
  function stop(){clearInterval(timer)}
  root.querySelector('.hero-arrow.next').addEventListener('click',()=>{stop();next();start()});
  root.querySelector('.hero-arrow.prev').addEventListener('click',()=>{stop();prev();start()});
  dots.forEach((d,idx)=>d.addEventListener('click',()=>{stop();go(idx);start()}));
  start();
})();
"""

CATS_JS = """
(function(){
  const root=document.querySelector('[data-cats]');
  if(!root)return;
  const track=root.querySelector('.cats-track');
  const prevBtn=document.querySelector('[data-cats-prev]');
  const nextBtn=document.querySelector('[data-cats-next]');
  let i=0;
  const isMobile=()=>window.innerWidth<=760;
  const getPages=()=>Array.from(track.querySelectorAll(isMobile()?'.cats-page-mobile':'.cats-page-desktop'));
  const getDots=()=>Array.from(root.querySelectorAll(isMobile()?'.cats-dot-mobile':'.cats-dot-desktop'));
  function go(n){
    const pages=getPages();
    if(!pages.length)return;
    i=(n+pages.length)%pages.length;
    track.style.transform='translateX(-'+(i*100)+'%)';
    getDots().forEach((d,idx)=>d.classList.toggle('is-active',idx===i));
  }
  if(nextBtn)nextBtn.addEventListener('click',()=>go(i+1));
  if(prevBtn)prevBtn.addEventListener('click',()=>go(i-1));
  root.querySelectorAll('.cats-dot').forEach((d)=>d.addEventListener('click',()=>go(parseInt(d.dataset.i||'0',10))));
  window.addEventListener('resize',()=>{i=0;go(0)});
  go(0);
})();
"""

BUYERS_JS = """
(function(){
  const root=document.querySelector('[data-buyers]');
  if(!root)return;
  const track=root.querySelector('.buyers-track');
  const section=root.closest('.section');
  const prevBtn=section?section.querySelector('.buyers-arrow.prev'):null;
  const nextBtn=section?section.querySelector('.buyers-arrow.next'):null;
  let i=0;
  const isMobile=()=>window.innerWidth<=760;
  const getPages=()=>Array.from(track.querySelectorAll(isMobile()?'.buyers-page-mobile':'.buyers-page-desktop'));
  const getDots=()=>Array.from(root.querySelectorAll(isMobile()?'.buyers-dot-mobile':'.buyers-dot-desktop'));
  function go(n){
    const pages=getPages();
    if(!pages.length)return;
    i=(n+pages.length)%pages.length;
    track.style.transform='translateX(-'+(i*100)+'%)';
    getDots().forEach((d,idx)=>d.classList.toggle('is-active',idx===i));
  }
  if(nextBtn)nextBtn.addEventListener('click',()=>go(i+1));
  if(prevBtn)prevBtn.addEventListener('click',()=>go(i-1));
  root.querySelectorAll('.buyers-dot').forEach((d)=>d.addEventListener('click',()=>go(parseInt(d.dataset.i||'0',10))));
  window.addEventListener('resize',()=>{i=0;go(0)});
  go(0);
})();
"""

REVIEWS_JS = """
(function(){
  const root=document.querySelector('[data-reviews]');
  if(!root)return;
  const isMobile=()=>window.innerWidth<=760;
  const getTrack=()=>root.querySelector(isMobile()?'.review-track-mobile':'.review-track-desktop');
  const getSlides=()=>Array.from((getTrack()||root).querySelectorAll('.review-slide'));
  const getDots=()=>Array.from(root.querySelectorAll(isMobile()?'.review-dot-mobile':'.review-dot-desktop'));
  let i=0,timer;
  function go(n){
    const track=getTrack();
    const slides=getSlides();
    if(!track || !slides.length)return;
    i=(n+slides.length)%slides.length;
    track.style.transform='translateX(-'+(i*100)+'%)';
    getDots().forEach((d,idx)=>d.classList.toggle('is-active',idx===i));
  }
  function next(){go(i+1)}
  function prev(){go(i-1)}
  function start(){timer=setInterval(next,5500)}
  function stop(){clearInterval(timer)}
  root.querySelector('.review-arrow.next').addEventListener('click',()=>{stop();next();start()});
  root.querySelector('.review-arrow.prev').addEventListener('click',()=>{stop();prev();start()});
  root.querySelectorAll('.review-dot').forEach((d)=>d.addEventListener('click',()=>{stop();go(parseInt(d.dataset.i||'0',10));start()}));
  window.addEventListener('resize',()=>{i=0;go(0)});
  go(0);
  start();
})();
"""


def page(title, body, desc="Магазин техники Apple и аксессуаров в Набережных Челнах."):
    return (
        "<!DOCTYPE html>"
        "<html lang=\"ru\">"
        "<head>"
        "<meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        f"<title>{html.escape(title)}</title>"
        f"<meta name=\"description\" content=\"{html.escape(desc)}\">"
        "<link rel=\"icon\" type=\"image/png\" href=\"/assets/header-logo.png\">"
        "<style>" + STYLE + "</style>"
        "</head>"
        "<body><div class=\"page\">"
        + body +
        "</div>"
        "<script>" + HERO_JS + CATS_JS + BUYERS_JS + REVIEWS_JS + "</script>"
        "</body></html>"
    )


def build_header(active=""):
    nav_items = [("catalog", "/catalog/", "Каталог")]
    for slug, label in [
        ("iphone", "iPhone"),
        ("air-pods", "AirPods"),
        ("mac", "Mac"),
        ("apple-watch", "Apple Watch"),
        ("ipad", "iPad"),
        ("samsung", "Samsung"),
        ("dyson", "Dyson"),
        ("aksessuary", "Аксессуары"),
    ]:
        nav_items.append((slug, f"/catalog/{slug}/", label))

    nav = "".join(
        f'<a class="{"catalog-link " if slug=="catalog" else ""}{"active" if slug==active else ""}" href="{href}">{label}</a>'
        for slug, href, label in nav_items
    )

    return f"""
    <div class="topbar">
      <div class="topbar-left">
        <a href="/#gift">Подарочный сертификат</a>
        <a href="/#contacts">Сервис</a>
        <a href="/#contacts">Контакты</a>
      </div>
      <div class="topbar-right">
        <span>{html.escape(DONOR['address_short'])}</span>
        <span>{html.escape(DONOR['hours'])}</span>
        <a href="{DONOR['phone_href']}">{html.escape(DONOR['phone'])}</a>
      </div>
    </div>
    <header class="header">
      <div class="header-row">
        <div class="logo-slot" aria-label="logo"><img src="/assets/header-logo.png" alt="iStore logo"></div>
        <div class="search">Поиск по каталогу</div>
      </div>
      <nav class="nav">{nav}</nav>
    </header>
    """


def build_hero():
    slides = "".join(
        f'<div class="hero-slide{" is-active" if i==0 else ""}"><h2>{html.escape(t)}</h2></div>'
        for i, t in enumerate(HERO_SLIDES)
    )
    dots = "".join(
        f'<button class="hero-dot{" is-active" if i==0 else ""}" aria-label="slide {i+1}"></button>'
        for i in range(len(HERO_SLIDES))
    )
    return f"""
    <section class="section">
      <div class="hero" data-hero>
        <div class="hero-slides">{slides}</div>
        <button class="hero-arrow prev" aria-label="prev">‹</button>
        <button class="hero-arrow next" aria-label="next">›</button>
        <div class="hero-dots">{dots}</div>
      </div>
    </section>
    """


def build_home_categories(categories):
    pages_desktop = [categories[i:i + 4] for i in range(0, len(categories), 4)]
    pages_mobile = [categories[i:i + 2] for i in range(0, len(categories), 2)]
    pages_html = ""
    for page_cats in pages_desktop:
        cards = "".join(
            f'<a class="cat-card" href="/catalog/{html.escape(c.get("slug") or "")}/">'
            f'<img src="/assets/{c.get("image") or PLACEHOLDER_IMG}" alt="{html.escape(c.get("title") or "")}" loading="lazy">'
            f'<div class="cat-card-name">{html.escape(c.get("title") or "")}</div>'
            f'</a>'
            for c in page_cats
        )
        pages_html += f'<div class="cats-page cats-page-desktop">{cards}</div>'
    for page_cats in pages_mobile:
        cards = "".join(
            f'<a class="cat-card" href="/catalog/{html.escape(c.get("slug") or "")}/">'
            f'<img src="/assets/{c.get("image") or PLACEHOLDER_IMG}" alt="{html.escape(c.get("title") or "")}" loading="lazy">'
            f'<div class="cat-card-name">{html.escape(c.get("title") or "")}</div>'
            f'</a>'
            for c in page_cats
        )
        pages_html += f'<div class="cats-page cats-page-mobile">{cards}</div>'
    dots_desktop = "".join(
        f'<button data-i="{i}" class="cats-dot cats-dot-desktop{" is-active" if i==0 else ""}" aria-label="cats page {i+1}"></button>'
        for i in range(len(pages_desktop))
    )
    dots_mobile = "".join(
        f'<button data-i="{i}" class="cats-dot cats-dot-mobile{" is-active" if i==0 else ""}" aria-label="cats mobile page {i+1}"></button>'
        for i in range(len(pages_mobile))
    )
    return f"""
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Категории</h2>
        <div class="section-controls">
          <button class="cats-arrow prev" aria-label="prev" data-cats-prev>‹</button>
          <button class="cats-arrow next" aria-label="next" data-cats-next>›</button>
          <a class="section-link" href="/catalog/">Весь каталог →</a>
        </div>
      </div>
      <div class="cats-carousel" data-cats>
        <div class="cats-viewport"><div class="cats-track">{pages_html}</div></div>
      </div>
      <div class="cats-dots cats-dots-desktop">{dots_desktop}</div>
      <div class="cats-dots cats-dots-mobile">{dots_mobile}</div>
    </section>
    """


def render_product_card(p):
    chips = (
        f'<div class="product-meta">'
        f'<span class="meta-chip">{html.escape(p.get("storage", "256 ГБ"))}</span>'
        f'<span class="meta-chip">{html.escape(p.get("sim", "NANO SIM+ESIM"))}</span>'
        f'</div>'
    )
    dots = "".join(
        f'<span class="color-dot" style="background:{html.escape(color)}"></span>'
        for color in (p.get("colors") or [])
    )
    return (
        f'<article class="product-card">'
        f'<div class="product-media"><img src="/assets/{p["image"]}" alt="{html.escape(p["title"])}" loading="lazy"></div>'
        f'<div class="product-body">'
        f'<div class="product-title">{html.escape(p["title"])}</div>'
        f'<div class="product-sub">{html.escape(p["subtitle"])}</div>'
        f'{chips}'
        f'<div class="color-dots">{dots}</div>'
        f'<div class="price">{html.escape(p["price"])}</div>'
        f'</div>'
        f'</article>'
    )


def build_product_grid():
    cards = [render_product_card(p) for p in products]
    pages_desktop = [cards[i:i + 4] for i in range(0, len(cards), 4)]
    pages_mobile = [cards[i:i + 2] for i in range(0, len(cards), 2)]
    pages_html = "".join(f'<div class="buyers-page buyers-page-desktop">{"".join(page_cards)}</div>' for page_cards in pages_desktop)
    pages_html += "".join(f'<div class="buyers-page buyers-page-mobile">{"".join(page_cards)}</div>' for page_cards in pages_mobile)
    dots_desktop = "".join(
        f'<button data-i="{i}" class="buyers-dot buyers-dot-desktop{" is-active" if i==0 else ""}" aria-label="buyers page {i+1}"></button>'
        for i in range(len(pages_desktop))
    )
    dots_mobile = "".join(
        f'<button data-i="{i}" class="buyers-dot buyers-dot-mobile{" is-active" if i==0 else ""}" aria-label="buyers mobile page {i+1}"></button>'
        for i in range(len(pages_mobile))
    )
    return f"""
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Выбор покупателей</h2>
        <div class="section-controls">
          <button class="buyers-arrow prev" aria-label="prev">‹</button>
          <button class="buyers-arrow next" aria-label="next">›</button>
          <a class="section-link" href="/catalog/iphone/">Смотреть все →</a>
        </div>
      </div>
      <div class="buyers-carousel" data-buyers>
        <div class="buyers-viewport"><div class="buyers-track">{pages_html}</div></div>
      </div>
      <div class="buyers-dots buyers-dots-desktop">{dots_desktop}</div>
      <div class="buyers-dots buyers-dots-mobile">{dots_mobile}</div>
    </section>
    """


def build_promo_blocks():
    return """
    <section class="section">
      <div class="promo-grid">
        <article class="promo-card">
          <div class="promo-content">
            <h3 class="promo-title">Trade-In: обменяй старое на новое</h3>
            <p class="promo-text">Сдайте старое устройство и получите скидку на покупку нового. Получите дополнительную выгоду уже при обмене.</p>
            <a class="promo-btn" href="/catalog/">Подробнее</a>
          </div>
          <div class="promo-image">
            <img src="/trade-in.jpg" alt="Trade in">
          </div>
        </article>
        <article class="promo-card">
          <div class="promo-content">
            <h3 class="promo-title">Рассрочка без процентов</h3>
            <p class="promo-text">Оформите покупку в рассрочку на выгодных условиях без переплат на срок до 36 месяцев.</p>
            <a class="promo-btn" href="/catalog/">Подробнее</a>
          </div>
          <div class="promo-image">
            <img src="/percent.jpg" alt="Рассрочка">
          </div>
        </article>
      </div>
    </section>
    """


def build_gift_block():
    return f"""
    <section class="section" id="gift">
      <div class="gift">
        <div>
          <h2>Подарочный сертификат</h2>
          <p>У нас можно приобрести подарочный сертификат.</p>
          <p>Не знаете что конкретно подарить? Подарите сертификат на сумму от 5 000 до 200 000 рублей и уже сами выберут себе подарок.</p>
          <a class="promo-btn" href="/catalog/">Подробнее</a>
        </div>
        <div class="gift-img"><img src="/assets/{GIFT_CERT_FILE}" alt="Подарочный сертификат"></div>
      </div>
    </section>
    """


def build_reviews_slider():
    pair_size = 2
    pairs = [reviews[i:i + pair_size] for i in range(0, len(reviews), pair_size)]
    slides_html_desktop = ""
    for pair in pairs:
        cards = "".join(
            f'<article class="review-card">'
            f'<div class="review-author">{html.escape(author)}</div>'
            f'<div class="review-date">Отзыв с 2GIS</div>'
            f'<p>{html.escape(text)}</p>'
            f'</article>'
            for author, text in pair
        )
        slides_html_desktop += f'<div class="review-slide">{cards}</div>'
    slides_html_mobile = "".join(
        f'<div class="review-slide"><article class="review-card">'
        f'<div class="review-author">{html.escape(author)}</div>'
        f'<div class="review-date">Отзыв с 2GIS</div>'
        f'<p>{html.escape(text)}</p>'
        f'</article></div>'
        for author, text in reviews
    )
    dots_desktop = "".join(
        f'<button data-i="{i}" class="review-dot review-dot-desktop{" is-active" if i==0 else ""}" aria-label="reviews slide {i+1}"></button>'
        for i in range(len(pairs))
    )
    dots_mobile = "".join(
        f'<button data-i="{i}" class="review-dot review-dot-mobile{" is-active" if i==0 else ""}" aria-label="reviews mobile slide {i+1}"></button>'
        for i in range(len(reviews))
    )
    return f"""
    <section class="section">
      <h2 class="section-title" style="margin-bottom:16px">Отзывы</h2>
      <div class="reviews" data-reviews>
        <div class="reviews-head">
          <a class="brand" href="{DONOR['reviews_url']}" target="_blank" rel="noopener">
            <img class="brand-logo" src="/2gis.svg" alt="2GIS">
            <div class="rating">4.9</div>
            <div class="stars">★★★★★</div>
          </a>
          <div class="review-controls">
            <button class="review-arrow prev" aria-label="prev">‹</button>
            <button class="review-arrow next" aria-label="next">›</button>
          </div>
          <a class="to-2gis" href="{DONOR['reviews_url']}" target="_blank" rel="noopener">Читать все на 2GIS</a>
        </div>
        <div class="review-slider">
          <div class="review-viewport">
            <div class="review-track review-track-desktop">{slides_html_desktop}</div>
            <div class="review-track review-track-mobile">{slides_html_mobile}</div>
          </div>
        </div>
        <div class="review-dots review-dots-desktop">{dots_desktop}</div>
        <div class="review-dots review-dots-mobile">{dots_mobile}</div>
      </div>
    </section>
    """


def build_contacts_block():
    return f"""
    <section class="section" id="contacts">
      <h2 class="section-title" style="margin-bottom:16px">Контакты</h2>
      <div class="contacts">
        <div class="contacts-info">
          <div class="row">
            <div class="label">Адрес</div>
            <p>{html.escape(DONOR['address_full'])}</p>
          </div>
          <div class="row">
            <div class="label">Режим работы</div>
            <p>{html.escape(DONOR['hours'])}</p>
          </div>
          <div class="row">
            <div class="label">Телефон магазина</div>
            <p><a href="{DONOR['phone_href']}">{html.escape(DONOR['phone'])}</a></p>
          </div>
          <div class="row">
            <div class="label">Сервис iRemont-116</div>
            <p><a href="{DONOR['service_phone_href']}">{html.escape(DONOR['service_phone'])}</a></p>
          </div>
          <div class="row">
            <div class="label">Email</div>
            <p><a href="mailto:{DONOR['email']}">{html.escape(DONOR['email'])}</a></p>
          </div>
        </div>
        <div class="contacts-map">
          <iframe src="{DONOR['map_embed']}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>
    """


def build_footer():
    return f"""
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <h3>iStore Набережные Челны</h3>
          <p>{html.escape(DONOR['address_full'])}</p>
          <p>{html.escape(DONOR['hours'])}</p>
        </div>
        <div>
          <h3>Связь</h3>
          <p><a href="{DONOR['phone_href']}">{html.escape(DONOR['phone'])}</a></p>
          <p><a href="{DONOR['service_phone_href']}">{html.escape(DONOR['service_phone'])}</a> — сервис</p>
          <p><a href="mailto:{DONOR['email']}">{html.escape(DONOR['email'])}</a></p>
        </div>
        <div>
          <h3>Разделы</h3>
          <p><a href="/">Главная</a></p>
          <p><a href="/catalog/">Каталог</a></p>
          <p><a href="{DONOR['reviews_url']}" target="_blank" rel="noopener">Отзывы в 2GIS</a></p>
        </div>
      </div>
      <div class="footer-copy">© iStore Набережные Челны. Все товарные знаки принадлежат их правообладателям.</div>
    </footer>
    """


def build_breadcrumbs(items):
    parts = []
    for i, (label, href) in enumerate(items):
        if i > 0:
            parts.append('<span class="sep">/</span>')
        if href and i < len(items) - 1:
            parts.append(f'<a href="{href}">{html.escape(label)}</a>')
        else:
            parts.append(f'<span>{html.escape(label)}</span>')
    return f'<nav class="breadcrumbs">{"".join(parts)}</nav>'


def build_catalog_index_body():
    tiles = "".join(
        f'<a class="catalog-tile" href="/catalog/{html.escape(c.get("slug") or "")}/">'
        f'<div class="catalog-tile-img"><img src="/assets/{c.get("image") or PLACEHOLDER_IMG}" alt="{html.escape(c.get("title") or "")}" loading="lazy"></div>'
        f'<div class="catalog-tile-name">{html.escape(c.get("title") or "")}</div>'
        f'</a>'
        for c in all_top_categories
    )
    return (
        build_breadcrumbs([("Главная", "/"), ("Каталог", None)])
        + '<section class="section"><div class="section-head"><h1 class="section-title">Каталог</h1></div>'
          f'<div class="catalog-grid">{tiles}</div></section>'
    )


def build_category_body(category):
    slug = category.get("slug") or ""
    title = category.get("title") or ""
    cat_products = CATEGORY_PRODUCTS.get(slug) or []
    if cat_products:
        cards = "".join(render_product_card(p) for p in cat_products)
        content = f'<div class="grid">{cards}</div>'
    else:
        content = '<div class="empty-state">Скоро в наличии</div>'

    return (
        build_breadcrumbs([("Главная", "/"), ("Каталог", "/catalog/"), (title, None)])
        + f'<section class="section"><div class="section-head"><h1 class="section-title">{html.escape(title)}</h1></div>'
          f'{content}</section>'
    )


home_html = page(
    "iStore Набережные Челны — техника Apple",
    build_header()
    + build_hero()
    + build_home_categories(all_top_categories)
    + build_product_grid()
    + build_gift_block()
    + build_promo_blocks()
    + build_reviews_slider()
    + build_contacts_block()
    + build_footer(),
)

catalog_html = page(
    "Каталог — iStore Набережные Челны",
    build_header(active="catalog")
    + build_catalog_index_body()
    + build_footer(),
)

(WWW / "index.html").write_text(home_html, encoding="utf-8")
(WWW / "catalog").mkdir(parents=True, exist_ok=True)
(WWW / "catalog" / "index.html").write_text(catalog_html, encoding="utf-8")

# wipe old per-slug catalog dirs, keep only index.html
catalog_dir = WWW / "catalog"
for child in catalog_dir.iterdir():
    if child.is_dir():
        shutil.rmtree(child)

for category in all_top_categories:
    slug = category.get("slug") or ""
    if not slug:
        continue
    cat_dir = catalog_dir / slug
    cat_dir.mkdir(parents=True, exist_ok=True)
    cat_html = page(
        f"{category.get('title') or slug} — iStore Набережные Челны",
        build_header(active=slug)
        + build_category_body(category)
        + build_footer(),
    )
    (cat_dir / "index.html").write_text(cat_html, encoding="utf-8")

products_dir = WWW / "products"
if products_dir.exists():
    shutil.rmtree(products_dir)

print("static pages rebuilt")
print("categories_total", len(all_top_categories), "products", len(products))
