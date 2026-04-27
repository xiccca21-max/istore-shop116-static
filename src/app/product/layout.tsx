import "./product-chrome.css";
import "./product-pdp.css";

export default function ProductRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="istore-product-root">
      <div className="istore-page-shell">
        <div className="topbar">
          <div className="topbar-left">
            <a href="/installment/">Рассрочка</a>
            <a href="/trade-in/">Trade-In</a>
            <a href="/gifts/">Подарки</a>
            <a href="/raffle/">Розыгрыш</a>
            <a href="/#gift">Сертификат</a>
            <a href="/iremont116/">Сервис</a>
            <a href="/#contacts">Контакты</a>
          </div>
          <div className="topbar-right">
            <span>Набережные Челны, Сююмбике 21/33</span>
            <span>10:00–20:00 ежедневно</span>
            <a href="tel:+79870059039">+7 (987) 005-90-39</a>
          </div>
        </div>

        <header className="header">
          <div className="header-row">
            <div className="logo-slot" aria-label="logo">
              <img src="/assets/header-logo.png" alt="iStore logo" />
            </div>
            <form className="search" role="search" action="/catalog/" method="get" data-search>
              <span className="search-icon" aria-hidden="true" />
              <input className="search-input" name="q" placeholder="Поиск по каталогу" autoComplete="off" />
              <button className="search-btn" type="submit">
                Найти
              </button>
            </form>
          </div>
          <nav className="nav">
            <a className="catalog-link" href="/catalog/">
              Каталог
            </a>
            <a href="/catalog/iphone/">iPhone</a>
            <a href="/catalog/air-pods/">AirPods</a>
            <a href="/catalog/mac/">Mac</a>
            <a href="/catalog/apple-watch/">Apple Watch</a>
            <a href="/catalog/ipad/">iPad</a>
            <a href="/catalog/samsung/">Samsung</a>
            <a href="/catalog/dyson/">Dyson</a>
            <a href="/catalog/aksessuary/">Аксессуары</a>
          </nav>
        </header>

        {children}
      </div>
    </div>
  );
}
