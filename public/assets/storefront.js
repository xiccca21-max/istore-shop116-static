(() => {
  const CART_KEY = "istore_cart_v1";

  function safeJsonParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    const v = raw ? safeJsonParse(raw) : null;
    return Array.isArray(v) ? v : [];
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function cartCount(items) {
    return items.reduce((sum, it) => sum + Math.max(0, parseInt(it?.qty ?? 0, 10) || 0), 0);
  }

  function renderBadge() {
    const badge = document.querySelector("[data-cart-badge]");
    if (!badge) return;
    const n = cartCount(loadCart());
    if (n > 0) {
      badge.textContent = String(n);
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  function ensureCartUi() {
    const headerRow = document.querySelector(".header-row");
    if (!headerRow) return;
    if (headerRow.querySelector(".cart-link")) return;

    const a = document.createElement("a");
    a.className = "cart-link";
    a.href = "/checkout";
    a.setAttribute("aria-label", "Корзина");
    a.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 7h14l-2 8H8L7 7Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M7 7 6.3 4.8A2 2 0 0 0 4.4 3.5H3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9.5 20.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" fill="#fff"/>
        <path d="M18 20.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" fill="#fff"/>
      </svg>
      <span class="cart-badge" data-cart-badge style="display:none">0</span>
    `;
    headerRow.appendChild(a);

    // Minimal styles if page didn't have them yet.
    const style = document.createElement("style");
    style.textContent = `
      .cart-link{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;border:1px solid #333;background:#161616;position:relative}
      .cart-link:hover{background:#1f1f1f;border-color:#3a3a3a}
      .cart-badge{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--accent,#ff6600);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1}
      .product-card{cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function ensureLogoLink() {
    const slot = document.querySelector(".logo-slot");
    if (!slot) return;
    // If already an <a>, do nothing.
    const existing = slot.querySelector("a");
    if (existing) return;
    const img = slot.querySelector("img");
    if (!img) return;

    const a = document.createElement("a");
    a.href = "/";
    a.setAttribute("aria-label", "На главную");
    a.style.display = "flex";
    a.style.alignItems = "center";
    a.style.justifyContent = "center";
    a.style.height = "100%";
    a.style.width = "100%";
    a.style.cursor = "pointer";

    // Move the image into the link.
    slot.innerHTML = "";
    a.appendChild(img);
    slot.appendChild(a);
  }

  function addToCartFromCard(card) {
    const title = card.querySelector(".product-title")?.textContent?.trim() || "Товар";
    const subtitle = card.querySelector(".product-sub")?.textContent?.trim() || "";
    const img = card.querySelector("img")?.getAttribute("src") || null;
    const priceText = card.querySelector(".price")?.textContent || "";
    const price = parseInt(String(priceText).replace(/[^\d]/g, ""), 10) || 0;

    // Use stable id derived from title+price+img.
    const variantId = btoa(unescape(encodeURIComponent(`${title}|${price}|${img || ""}`))).slice(0, 32);
    const productId = variantId;

    const items = loadCart();
    const idx = items.findIndex((x) => x?.variantId === variantId);
    if (idx >= 0) items[idx] = { ...items[idx], qty: (items[idx].qty || 0) + 1 };
    else items.push({ variantId, productId, title, subtitle, imageUrl: img, price, qty: 1 });
    saveCart(items);
    renderBadge();
  }

  function slugify(input) {
    return String(input)
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function baseModelFromTitle(title) {
    let t = String(title).trim();
    t = t.replace(/\b\d{1,2}\s*\/\s*\d{2,5}\b/g, "");
    t = t.replace(/\b\d{1,2}\s*(?:tb|тб)\b/gi, "");
    t = t.replace(/\b\d{2,5}\s*(?:gb|гб)\b/gi, "");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  function wireProductCards() {
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const card = target.closest?.(".product-card");
      if (!card) return;
      // Do not steal clicks from actual links/buttons inside card, if any appear later.
      if (target.closest("a,button,input,textarea,select")) return;
      const title = card.querySelector(".product-title")?.textContent?.trim() || "";
      if (title) {
        const slug = slugify(baseModelFromTitle(title));
        if (slug) {
          window.location.href = `/product/${slug}`;
          return;
        }
      }
      addToCartFromCard(card); // fallback
    });
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function ensureSearchSuggestStyles() {
    if (document.getElementById("istore-search-suggest-style")) return;
    const style = document.createElement("style");
    style.id = "istore-search-suggest-style";
    style.textContent = `
      .search{position:relative}
      .search-suggest{position:absolute;left:0;right:0;top:calc(100% + 8px);background:#151515;border:1px solid #2d2d2d;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;z-index:9999}
      .search-suggest a{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-top:1px solid #222}
      .search-suggest a:first-child{border-top:0}
      .search-suggest a:hover{background:#1f1f1f}
      .search-suggest-title{font-weight:800;font-size:13px;line-height:1.25}
      .search-suggest-sub{opacity:.7;font-size:12px;line-height:1.3;margin-top:2px}
      .search-suggest-price{margin-left:auto;color:var(--accent,#ff6600);font-weight:900;font-size:12px;white-space:nowrap}
      .search-suggest-empty{padding:12px 12px;color:rgba(255,255,255,.65);font-size:12px}
    `;
    document.head.appendChild(style);
  }

  function priceFmt(n) {
    try {
      return Number(n || 0).toLocaleString("ru-RU") + " ₽";
    } catch {
      return String(n || 0) + " ₽";
    }
  }

  function initHeaderSearch() {
    const forms = Array.from(document.querySelectorAll("[data-search]"));
    if (!forms.length) return;
    ensureSearchSuggestStyles();

    for (const form of forms) {
      if (!(form instanceof HTMLFormElement)) continue;
      const input = form.querySelector(".search-input");
      if (!(input instanceof HTMLInputElement)) continue;
      if (form.dataset.suggestBound === "1") continue;
      form.dataset.suggestBound = "1";

      // Render dropdown in <body> so it can't be clipped by overflow/stacking contexts.
      const box = document.createElement("div");
      box.className = "search-suggest";
      box.style.display = "none";
      box.style.position = "absolute";
      box.style.left = "0px";
      box.style.top = "0px";
      box.style.width = "320px";
      box.style.pointerEvents = "auto";
      document.body.appendChild(box);

      let lastQ = "";
      let abort = null;

      const place = () => {
        const r = input.getBoundingClientRect();
        const left = Math.round(r.left + window.scrollX);
        const top = Math.round(r.bottom + window.scrollY + 8);
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${Math.max(260, Math.round(r.width))}px`;
      };

      const render = (items, q) => {
        if (!q) {
          box.style.display = "none";
          box.innerHTML = "";
          return;
        }
        place();
        if (!Array.isArray(items) || items.length === 0) {
          box.innerHTML = `<div class="search-suggest-empty">Ничего не найдено</div>`;
          box.style.display = "block";
          return;
        }
        box.innerHTML = items
          .map((p) => {
            const title = (p && p.title) ? String(p.title) : "Товар";
            const subtitle = (p && p.subtitle) ? String(p.subtitle) : "";
            const slug = (p && p.slug) ? String(p.slug) : "";
            const price = priceFmt(p && (p.basePrice ?? p.base_price));
            const href = slug ? `/product/${encodeURIComponent(slug)}` : `/catalog/?q=${encodeURIComponent(q)}`;
            return `<a href="${href}"><div><div class="search-suggest-title">${title}</div>${subtitle ? `<div class="search-suggest-sub">${subtitle}</div>` : ""}</div><div class="search-suggest-price">${price}</div></a>`;
          })
          .join("");
        box.style.display = "block";
      };

      const load = debounce(async () => {
        const q = input.value.trim();
        if (q === lastQ) return;
        lastQ = q;
        if (abort) abort.abort();
        abort = new AbortController();
        if (!q) return render([], "");
        try {
          const res = await fetch(`/api/public/products?q=${encodeURIComponent(q)}&limit=8`, { cache: "no-store", signal: abort.signal });
          const json = res.ok ? await res.json() : null;
          render(json && json.data ? json.data : [], q);
        } catch (_e) {
          render([], q);
        }
      }, 160);

      input.addEventListener("input", load);
      input.addEventListener("focus", () => {
        if (box.innerHTML.trim()) {
          place();
          box.style.display = "block";
        }
      });
      input.addEventListener("blur", () => {
        setTimeout(() => {
          box.style.display = "none";
        }, 140);
      });
      window.addEventListener("scroll", () => {
        if (box.style.display !== "none") place();
      }, { passive: true });
      window.addEventListener("resize", () => {
        if (box.style.display !== "none") place();
      });
      document.addEventListener("click", (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (t === input || form.contains(t) || box.contains(t)) return;
        box.style.display = "none";
      });

      form.addEventListener("submit", (e) => {
        const q = input.value.trim();
        if (!q) return;
        e.preventDefault();
        window.location.href = `/catalog/?q=${encodeURIComponent(q)}`;
      });
    }
  }

  function main() {
    ensureCartUi();
    ensureLogoLink();
    initHeaderSearch();
    wireProductCards();
    renderBadge();
    window.addEventListener("storage", renderBadge);
    window.addEventListener("istore-cart-changed", renderBadge);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

