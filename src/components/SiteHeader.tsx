import "./site-header.css";

export type SiteHeaderActiveKey =
  | "catalog"
  | "iphone"
  | "air-pods"
  | "mac"
  | "apple-watch"
  | "ipad"
  | "samsung"
  | "dyson"
  | "aksessuary"
  | "";

type Props = {
  activeKey?: SiteHeaderActiveKey;
};

/**
 * Server-rendered header that mirrors public/catalog/index.html's <body>
 * markup byte-for-byte. The interactive bits (cart link, mobile menu toggle
 * wiring, mobile category strip with arrows, search suggestions) are all
 * managed by /assets/storefront.js — exactly like on /catalog/.
 *
 * `suppressHydrationWarning` is set on every element whose subtree storefront.js
 * mutates, so React does not erase those mutations on hydration / reconciliation.
 */
export function SiteHeader({ activeKey = "" }: Props) {
  const cls = (key: SiteHeaderActiveKey, extra?: string) => {
    const parts: string[] = [];
    if (extra) parts.push(extra);
    if (activeKey && activeKey === key) parts.push("active");
    return parts.join(" ");
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <a href="/installment/">Рассрочка</a>
          <a href="/trade-in/">Trade-In</a>
          <a href="/gifts/">Подарки</a>
          <a href="/raffle/">Розыгрыш</a>
          <a href="/#gift">Сертификат</a>
          <a href="/iremont116/">Ремонт</a>
          <a href="/#contacts">Контакты</a>
        </div>
        <div className="topbar-right">
          <span>Набережные Челны, Сююмбике 21/33</span>
          <span>10:00–20:00 ежедневно</span>
          <a href="tel:+79870059039">+7 (987) 005-90-39</a>
        </div>
      </div>

      <header className="header" suppressHydrationWarning>
        <div className="header-row" suppressHydrationWarning>
          <div className="logo-slot" aria-label="logo">
            <a href="/" aria-label="На главную">
              <img src="/assets/header-logo.png" alt="iStore logo" />
            </a>
          </div>
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label="Меню"
            aria-expanded="false"
            aria-controls="mobile-menu"
            data-mobile-menu-toggle=""
          >
            <span className="burger">
              <span />
            </span>
          </button>
          <form
            className="search"
            role="search"
            action="/catalog/"
            method="get"
            data-search=""
          >
            <span className="search-icon" aria-hidden="true" />
            <input
              className="search-input"
              name="q"
              placeholder="Поиск по каталогу"
              autoComplete="off"
            />
            <button className="search-btn" type="submit">
              Найти
            </button>
          </form>
        </div>
        <div className="nav-shell" suppressHydrationWarning>
          <nav className="nav">
            <a className={cls("catalog", "catalog-link")} href="/catalog/">
              Каталог
            </a>
            <a className={cls("iphone")} href="/catalog/iphone/">
              iPhone
            </a>
            <a className={cls("air-pods")} href="/catalog/air-pods/">
              AirPods
            </a>
            <a className={cls("mac")} href="/catalog/mac/">
              Mac
            </a>
            <a className={cls("apple-watch")} href="/catalog/apple-watch/">
              <span className="label-full">Apple Watch</span>
              <span className="label-short">Watch</span>
            </a>
            <a className={cls("ipad", "nav-extra")} href="/catalog/ipad/">
              iPad
            </a>
            <a className={cls("samsung", "nav-extra")} href="/catalog/samsung/">
              Samsung
            </a>
            <a className={cls("dyson", "nav-extra")} href="/catalog/dyson/">
              Dyson
            </a>
            <a className={cls("aksessuary", "nav-extra")} href="/catalog/aksessuary/">
              <span className="label-full">Аксессуары</span>
              <span className="label-short">Акс.</span>
            </a>
            <button
              className="nav-more-toggle"
              type="button"
              data-nav-more-toggle=""
              aria-expanded="false"
              aria-controls="nav-more-menu"
            >
              Еще
            </button>
          </nav>
        </div>
      </header>

      <div className="mobile-menu-backdrop" data-mobile-menu-close="" />
      <div className="nav-more-backdrop" data-nav-more-close="" />

      <nav id="mobile-menu" className="mobile-menu" aria-label="Мобильное меню">
        <a href="/installment/">Рассрочка</a>
        <a href="/trade-in/">Trade-In</a>
        <a href="/gifts/">Подарки</a>
        <a href="/raffle/">Розыгрыш</a>
        <a href="/#gift">Сертификат</a>
        <a href="/iremont116/">Ремонт</a>
        <a href="/#contacts">Контакты</a>
      </nav>

      <nav id="nav-more-menu" className="nav-more-menu" aria-label="Дополнительные категории">
        <a href="/catalog/ipad/">iPad</a>
        <a href="/catalog/samsung/">Samsung</a>
        <a href="/catalog/dyson/">Dyson</a>
        <a href="/catalog/apple-watch/">Apple Watch</a>
        <a href="/catalog/aksessuary/">Аксессуары</a>
        <a href="/catalog/">Весь каталог</a>
      </nav>
    </>
  );
}
