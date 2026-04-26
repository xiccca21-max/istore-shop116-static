import Script from "next/script";
import { SiteFooter } from "@/components/SiteFooter";
import { GiftsCarousel } from "@/components/GiftsCarousel";

export default function GiftsPage() {
  return (
    <div className="page promoPage">
      <Script src="/assets/storefront.js?v=20260426-2" strategy="afterInteractive" />

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

      <nav className="breadcrumbs">
        <a href="/">Главная</a>
        <span className="sep">/</span>
        <span>Подарки</span>
      </nav>

      <section className="section">
        <div className="hero giftsHero">
          <div className="giftsHeroInner">
            <h1 className="giftsHeroTitle">
              <span className="giftsHeroLine1">Покупаешь iPhone — получаешь</span>
              <span className="giftsHeroLine2 giftsHeroAccent">три подарка</span>
            </h1>
            <div className="giftsHeroCta">
              <a className="btn primary" href="/catalog/iphone/">
                Забрать в подарок
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <GiftsCarousel />
      </section>

      <section className="section">
        <div className="giftsNote" role="note" aria-label="Примечание">
          <span className="giftsNoteIcon" aria-hidden="true">
            !
          </span>
          <span className="giftsNoteText">
            При покупке любого iPhone — дарим три подарка: AirPods, кардхолдер и Battery Pack.
          </span>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

