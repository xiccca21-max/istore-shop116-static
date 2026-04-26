import Script from "next/script";
import { SiteFooter } from "@/components/SiteFooter";

export default function TradeInPage() {
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
        <span>Trade‑In</span>
      </nav>

      <section className="section">
        <div className="hero tradeInHero">
          <div className="tradeInHeroLeft">
            <div className="kicker tradeInKicker">
              <span className="kdot" aria-hidden="true" />
              <span>Trade‑In</span> <span className="sep2">/</span> <span className="muted">обмен старого на новое</span>
            </div>
            <h1 className="tradeInTitle">
              <span className="tradeInTitleLine1">Обменяй старый телефон</span>
              <span className="tradeInTitleLine2">на новый</span>
            </h1>
            <p>
              Понятная схема: приносишь устройство — мы оцениваем — ты выбираешь новое — разницу доплачиваешь. Без театра, без
              “принесите справку о справке”.
            </p>
            <div className="cta">
              <a className="btn primary" href="tel:+79870059039">
                <svg className="tradeInBtnIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6.6 3.9h2.6l1.4 4.2-1.6 1.6c1.2 2.5 3.3 4.6 5.8 5.8l1.6-1.6 4.2 1.4v2.6c0 .6-.2 1.2-.7 1.6-.5.5-1 .7-1.6.7-8.3 0-15-6.7-15-15 0-.6.2-1.2.7-1.6.5-.5 1-.7 1.6-.7Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                Позвонить: +7 (987) 005‑90‑39
              </a>
              <a className="btn" href="https://t.me/iStore116Bot" target="_blank" rel="noopener">
                <svg className="tradeInBtnIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21.8 4.5c.3-1.4-1-2.1-2.2-1.7L2.9 9.2c-1.5.6-1.5 2.7.1 3.1l4.6 1.3 1.7 5.3c.4 1.3 2.1 1.6 3 .6l2.6-2.6 4.7 3.4c1 .7 2.3.2 2.5-1.1L21.8 4.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path d="M8 13.5 18.8 6.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                Написать в Telegram
              </a>
            </div>
          </div>

          <div className="tradeInHeroRight" aria-hidden="true">
            <img className="tradeInHeroImg" src="/assets/trade-in-hero.png" alt="" loading="eager" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="tradeInInfo">
          <div className="tradeInHow">
            <h2>Как это работает?</h2>

            <div className="tradeInTimeline" aria-hidden="true">
              <span className="line" />
              <span className="dot is-1" />
              <span className="dot is-2" />
              <span className="dot is-3" />
            </div>

            <div className="tradeInSteps">
              <div className="tradeInStep">
                <div className="tradeInStepNum">Шаг 01</div>
                <div className="tradeInStepText">Свяжись с нами и уточни состояние и комплектацию.</div>
              </div>
              <div className="tradeInStep">
                <div className="tradeInStepNum">Шаг 02</div>
                <div className="tradeInStepText">Мы согласуем цену устройства и пришлем стоимость.</div>
              </div>
              <div className="tradeInStep">
                <div className="tradeInStepNum">Шаг 03</div>
                <div className="tradeInStepText">Сдаешь устройство или доплачиваешь разницу и уходишь.</div>
              </div>
            </div>
          </div>

          <div className="tradeInFactors">
            <h2>Что влияет на цену?</h2>
            <ul className="tradeInCheck">
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Состояние устройства</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Модель устройства</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Память устройства</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Комплектация</span>
              </li>
            </ul>
          </div>

          <div className="tradeInNote" role="note" aria-label="Важно">
            <span className="tradeInNoteIcon" aria-hidden="true">
              !
            </span>
            <div className="tradeInNoteText">
              <b>Важно.</b> Оценка зависит от фактического состояния устройства. Если хочется “просто узнать примерно” — напиши в
              Telegram, пришли модель, память и пару фото — сориентируем.
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

