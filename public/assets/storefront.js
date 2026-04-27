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

  function isReactHeader() {
    // When the React <SiteHeader /> component is rendered, it manages the
    // header (cart, burger, mobile categories) on its own. The legacy
    // storefront.js DOM rebuild would fight React's virtual DOM and break
    // event handlers, so we opt out completely.
    return !!document.querySelector(".istoreHeader-root");
  }

  function ensureCartUi() {
    if (isReactHeader()) return;
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
        window.location.href = `/catalog/?q=${encodeURIComponent(title)}`;
        return;
      }
      window.location.href = "/catalog/";
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

  const ISTORE_NAV_LINKS = [
    { href: "/catalog/", label: "Каталог", key: "catalog", catalog: true },
    { href: "/catalog/iphone/", label: "iPhone", key: "iphone" },
    { href: "/catalog/air-pods/", label: "AirPods", key: "air-pods" },
    { href: "/catalog/mac/", label: "Mac", key: "mac" },
    { href: "/catalog/apple-watch/", label: "Apple Watch", key: "apple-watch" },
    { href: "/catalog/ipad/", label: "iPad", key: "ipad" },
    { href: "/catalog/samsung/", label: "Samsung", key: "samsung" },
    { href: "/catalog/dyson/", label: "Dyson", key: "dyson" },
    { href: "/catalog/aksessuary/", label: "Аксессуары", key: "aksessuary" },
  ];

  const ISTORE_MENU_LINKS = [
    { href: "/installment/", label: "Рассрочка" },
    { href: "/trade-in/", label: "Trade-In" },
    { href: "/gifts/", label: "Подарки" },
    { href: "/raffle/", label: "Розыгрыш" },
    { href: "/#gift", label: "Сертификат" },
    { href: "/iremont116/", label: "Сервис" },
    { href: "/#contacts", label: "Контакты" },
  ];

  function ensureUnifiedHeaderStyles() {
    if (isReactHeader()) return;
    const existing = document.getElementById("istore-unified-mobile-header-style");
    if (existing) return;
    const style = document.createElement("style");
    style.id = "istore-unified-mobile-header-style";
    style.textContent = `
      .mobile-menu-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:39}
      .mobile-menu{display:none;position:fixed;left:10px;right:10px;top:78px;background:rgba(25,25,25,.98);border:1px solid #2f2f2f;border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.35);padding:8px;z-index:40}
      .mobile-menu a{display:block;padding:12px 14px;border-radius:12px;color:#e6e6e6;font-size:15px;text-decoration:none}
      .mobile-menu a:hover{background:#232323}
      body.menu-open{overflow:hidden}
      body.menu-open .mobile-menu-backdrop{display:block}
      body.menu-open .mobile-menu{display:block}

      @media (min-width:761px){
        .mobile-menu-toggle,.mobile-strip-arrow,.nav-shell .mobile-strip-arrow{display:none !important}
      }

      @media (max-width:760px){
        .topbar{display:none !important}
        body > .topbar, .page > .topbar{display:none !important}

        .header{position:sticky !important;top:6px !important;z-index:30 !important;background:rgba(30,30,30,.92) !important;backdrop-filter:blur(16px) !important;-webkit-backdrop-filter:blur(16px) !important;border:1px solid #323232 !important;border-radius:22px !important;padding:8px 10px !important;box-shadow:0 12px 36px rgba(0,0,0,.35) !important}
        .header-row{display:grid !important;grid-template-columns:minmax(0,1fr) auto auto !important;align-items:center !important;gap:8px !important;padding:0 !important;margin:0 !important}
        .header .logo-slot{display:none !important}
        .mobile-cats,.mobile-cats-wrap,.nav-more-toggle,.nav-more-menu,.nav-more-backdrop{display:none !important}

        .mobile-menu-toggle{display:inline-flex !important;align-items:center;justify-content:center;grid-column:2 !important;grid-row:1 !important;width:30px !important;height:30px !important;padding:0 !important;border:0 !important;border-radius:0 !important;background:transparent !important;color:#f1f1f1 !important;font-size:0 !important;cursor:pointer}
        .mobile-menu-toggle .burger{position:relative;width:14px;height:10px;display:inline-block;transform:scale(1.25);transform-origin:center;color:#f1f1f1}
        .mobile-menu-toggle .burger::before,.mobile-menu-toggle .burger::after,.mobile-menu-toggle .burger span{content:"";position:absolute;left:0;width:100%;height:2px;background:currentColor;border-radius:2px;transition:transform .2s ease,opacity .2s ease}
        .mobile-menu-toggle .burger::before{top:0}
        .mobile-menu-toggle .burger span{top:4px}
        .mobile-menu-toggle .burger::after{top:8px}
        body.menu-open .mobile-menu-toggle .burger::before{transform:translateY(4px) rotate(45deg)}
        body.menu-open .mobile-menu-toggle .burger span{opacity:0}
        body.menu-open .mobile-menu-toggle .burger::after{transform:translateY(-4px) rotate(-45deg)}

        .header-row .cart-link{display:inline-flex !important;align-items:center;justify-content:center;grid-column:3 !important;grid-row:1 !important;justify-self:end !important;margin:0 !important;width:30px !important;height:30px !important;padding:0 !important;border:0 !important;border-radius:0 !important;background:transparent !important;position:relative}
        .header-row .cart-link svg{width:26px !important;height:26px !important}
        .header-row .cart-link .cart-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#ff6600;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1}

        .header-row .search{display:flex !important;align-items:center !important;grid-column:1 !important;grid-row:1 !important;justify-self:start !important;width:62% !important;min-width:200px !important;max-width:none !important;height:40px !important;padding:0 10px !important;gap:8px !important;border:1px solid #333 !important;background:#161616 !important;border-radius:999px !important;color:#7a7a7a !important;box-sizing:border-box}
        .header-row .search .search-icon{display:none !important}
        .header-row .search .search-input{flex:1 1 auto !important;min-width:0 !important;height:100% !important;border:0 !important;outline:0 !important;background:transparent !important;color:#ddd !important;font-size:13px !important;text-align:center !important}
        .header-row .search .search-input::placeholder{color:#7a7a7a !important}
        .header-row .search .search-btn{display:none !important}

        .header .nav-shell{display:grid !important;grid-template-columns:auto minmax(0,1fr) auto !important;align-items:center !important;gap:6px !important;margin:8px 0 0 0 !important;padding:0 !important;position:static !important}
        .header .nav-shell .nav{margin:0 !important;padding:0 0 2px 0 !important;gap:6px !important;display:flex !important;flex-wrap:nowrap !important;overflow-x:auto !important;overflow-y:hidden !important;-webkit-overflow-scrolling:touch !important;scroll-behavior:smooth !important;scrollbar-width:none !important}
        .header .nav-shell .nav::-webkit-scrollbar{display:none !important}
        .header .nav-shell .nav a{flex:0 0 auto !important;display:inline-flex !important;align-items:center !important;height:34px !important;padding:0 12px !important;border-radius:999px !important;background:#1b1b1b !important;border:1px solid #2d2d2d !important;color:#d9d9d9 !important;font-size:13px !important;white-space:nowrap !important;text-decoration:none !important}
        .header .nav-shell .nav a.catalog-link,
        .header .nav-shell .nav a.active{background:#ff6600 !important;border-color:#ff6600 !important;color:#fff !important}
        .header .nav-shell .nav .label-short{display:none !important}
        .header .nav-shell .nav .label-full{display:inline !important}
        .header .nav-shell .mobile-strip-arrow{display:grid !important;place-items:center !important;align-self:center !important;width:28px !important;height:36px !important;border:0 !important;background:transparent !important;color:#cfcfcf !important;font-size:20px !important;line-height:1 !important;padding:0 !important;cursor:pointer}
      }
    `;
    document.head.appendChild(style);
  }

  function buildNavInnerHTML(activeKey, path) {
    return ISTORE_NAV_LINKS
      .map((link) => {
        const isActive =
          (link.catalog && (path === "/catalog" || path === "/catalog/")) ||
          (!link.catalog && activeKey === link.key);
        const classes = [
          link.catalog ? "catalog-link" : "",
          isActive ? "active" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<a class="${classes}" href="${link.href}">${link.label}</a>`;
      })
      .join("");
  }

  function ensureUnifiedMobileHeader() {
    if (isReactHeader()) return;
    const header = document.querySelector(".header");
    if (!header) return;

    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const catMatch = path.match(/^\/catalog\/([^/]+)$/);
    const activeKey = catMatch ? catMatch[1] : (path === "/catalog" ? "catalog" : "");

    // 1. Header row: must contain logo slot, search form, mobile burger, cart link.
    let row = header.querySelector(".header-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "header-row";
      header.insertBefore(row, header.firstChild);
    }

    // 1a. Search form
    let search = row.querySelector(".search");
    if (!search) {
      search = document.createElement("form");
      search.className = "search";
      search.setAttribute("role", "search");
      search.setAttribute("action", "/catalog/");
      search.setAttribute("method", "get");
      search.setAttribute("data-search", "");
      search.innerHTML = `
        <span class="search-icon" aria-hidden="true"></span>
        <input class="search-input" name="q" placeholder="Поиск по каталогу" autocomplete="off">
        <button class="search-btn" type="submit">Найти</button>
      `;
      row.appendChild(search);
    } else if (!search.hasAttribute("data-search")) {
      search.setAttribute("data-search", "");
    }

    // 1b. Burger toggle
    let toggle = row.querySelector("[data-mobile-menu-toggle]");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "mobile-menu-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-label", "Меню");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", "mobile-menu");
      toggle.setAttribute("data-mobile-menu-toggle", "");
      toggle.innerHTML = '<span class="burger"><span></span></span>';
      row.appendChild(toggle);
    } else if (!toggle.querySelector(".burger")) {
      toggle.innerHTML = '<span class="burger"><span></span></span>';
    }

    // 1c. Cart link (ensure exists, then place after toggle)
    let cart = row.querySelector(".cart-link");
    if (!cart) {
      cart = document.createElement("a");
      cart.className = "cart-link";
      cart.href = "/checkout";
      cart.setAttribute("aria-label", "Корзина");
      cart.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 7h14l-2 8H8L7 7Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M7 7 6.3 4.8A2 2 0 0 0 4.4 3.5H3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M9.5 20.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" fill="#fff"/>
          <path d="M18 20.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" fill="#fff"/>
        </svg>
        <span class="cart-badge" data-cart-badge style="display:none">0</span>
      `;
      row.appendChild(cart);
    }

    // Ensure DOM order in row: logo-slot (if any), search, toggle, cart.
    const logoSlot = row.querySelector(".logo-slot");
    if (logoSlot) row.insertBefore(logoSlot, row.firstChild);
    row.appendChild(search);
    row.appendChild(toggle);
    row.appendChild(cart);

    // 2. Remove any legacy mobile-only blocks that duplicate the strip.
    document.querySelectorAll(".mobile-cats, .mobile-cats-wrap").forEach((el) => el.remove());

    // 3. Nav shell: arrow + nav + arrow inside the header (sibling of header-row).
    let shell = header.querySelector(".nav-shell");
    let nav = header.querySelector(".nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "nav";
    }
    nav.innerHTML = buildNavInnerHTML(activeKey, path);
    nav.setAttribute("data-mobile-strip", "");

    if (!shell) {
      shell = document.createElement("div");
      shell.className = "nav-shell";
      header.appendChild(shell);
    }
    shell.setAttribute("data-mobile-switcher", "");
    if (nav.parentElement !== shell) shell.appendChild(nav);

    let prev = shell.querySelector("[data-mobile-strip-prev]");
    if (!prev) {
      prev = document.createElement("button");
      prev.className = "mobile-strip-arrow prev";
      prev.type = "button";
      prev.setAttribute("aria-label", "Предыдущие категории");
      prev.setAttribute("data-mobile-strip-prev", "");
      prev.textContent = "‹";
    }
    let next = shell.querySelector("[data-mobile-strip-next]");
    if (!next) {
      next = document.createElement("button");
      next.className = "mobile-strip-arrow next";
      next.type = "button";
      next.setAttribute("aria-label", "Следующие категории");
      next.setAttribute("data-mobile-strip-next", "");
      next.textContent = "›";
    }
    shell.insertBefore(prev, nav);
    shell.appendChild(next);

    // Ensure shell is the LAST child of header (after the row).
    if (header.lastElementChild !== shell) header.appendChild(shell);

    // 4. Backdrop + mobile menu overlay (placed right after header).
    let backdrop = document.querySelector(".mobile-menu-backdrop[data-mobile-menu-close]");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "mobile-menu-backdrop";
      backdrop.setAttribute("data-mobile-menu-close", "");
      header.insertAdjacentElement("afterend", backdrop);
    }
    // Force base style so display toggle works regardless of page CSS.
    backdrop.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1039";

    let menu = document.getElementById("mobile-menu");
    if (!menu) {
      menu = document.createElement("nav");
      menu.id = "mobile-menu";
      menu.className = "mobile-menu";
      menu.setAttribute("aria-label", "Мобильное меню");
      backdrop.insertAdjacentElement("afterend", menu);
    }
    // Force base style so display toggle works regardless of page CSS.
    menu.style.cssText = "display:none;position:fixed;left:10px;right:10px;top:78px;background:rgba(25,25,25,.98);border:1px solid #2f2f2f;border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.35);padding:8px;z-index:1040";
    menu.innerHTML = ISTORE_MENU_LINKS
      .map((l) => `<a href="${l.href}" style="display:block;padding:12px 14px;border-radius:12px;color:#e6e6e6;font-size:15px;text-decoration:none">${l.label}</a>`)
      .join("");

    // 5. Wire interactions — use direct style.display so no CSS can block it.
    const isMenuOpen = () => backdrop.style.display !== "none";

    const setMenuOpen = (open) => {
      backdrop.style.display = open ? "block" : "none";
      menu.style.display = open ? "block" : "none";
      document.body.style.overflow = open ? "hidden" : "";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    toggle.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(!isMenuOpen());
    };
    backdrop.onclick = () => setMenuOpen(false);
    menu.querySelectorAll("a").forEach((a) => {
      a.onclick = () => setMenuOpen(false);
    });

    if (shell.getAttribute("data-bound-strip") !== "1") {
      shell.setAttribute("data-bound-strip", "1");
      prev.addEventListener("click", () => nav.scrollBy({ left: -180, behavior: "smooth" }));
      next.addEventListener("click", () => nav.scrollBy({ left: 180, behavior: "smooth" }));
    }

    if (!document.body.dataset.mobileHeaderEscBound) {
      document.body.dataset.mobileHeaderEscBound = "1";
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenuOpen(false);
      });
    }
  }

  function main() {
    ensureCartUi();
    ensureLogoLink();
    ensureUnifiedHeaderStyles();
    ensureUnifiedMobileHeader();
    initHeaderSearch();
    wireProductCards();
    renderBadge();
  }

  // Idempotent runner — safe to call multiple times.
  function run() {
    try {
      main();
    } catch (e) {
      try { console.error("storefront main() failed", e); } catch (_) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  // Re-run on Next.js client-side route changes. We watch the body for any
  // header swap so the unified mobile header is rebuilt on every page.
  if (!window.__istoreMainBound) {
    window.__istoreMainBound = true;
    window.addEventListener("storage", () => { try { renderBadge(); } catch (_) {} });
    window.addEventListener("istore-cart-changed", () => { try { renderBadge(); } catch (_) {} });

    let pending = false;
    const schedule = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        run();
      });
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(".header") || node.querySelector?.(".header")) {
            schedule();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Also re-run on URL changes (Next.js pushState).
    const _push = history.pushState;
    history.pushState = function () {
      const ret = _push.apply(this, arguments);
      schedule();
      return ret;
    };
    window.addEventListener("popstate", schedule);
  }
})();

