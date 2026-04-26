import Script from "next/script";
import { SiteFooter } from "@/components/SiteFooter";

export default function RafflePage() {
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
        <span>Розыгрыш</span>
      </nav>

      <section className="section">
        <div className="hero raffleBanner" aria-label="Баннер розыгрыша">
          <img className="raffleBannerImg" src="/assets/raffle-banner.png" alt="" aria-hidden="true" />
        </div>
      </section>

      <section className="section">
        <div className="tradeInInfo raffleHowInfo">
          <div className="tradeInHow">
            <h2>Как участвовать?</h2>
            <div className="raffleSteps">
              <div className="raffleStepCard">
                <div className="raffleStepTop">
                  <div className="raffleStepTitle">Подписка на канал</div>
                  <span className="raffleStepBigNum" aria-hidden="true">
                    01
                  </span>
                </div>
                <div className="raffleStepText">
                  Подпишись на Telegram‑канал <b>iStore116</b> — там старт и все обновления.
                </div>
              </div>

              <div className="raffleStepCard">
                <div className="raffleStepTop">
                  <div className="raffleStepTitle">Участие в посте</div>
                  <span className="raffleStepBigNum" aria-hidden="true">
                    02
                  </span>
                </div>
                <div className="raffleStepText">
                  Открой пост с текущим розыгрышем и нажми <b>“участвовать”</b>. Займёт 10 секунд.
                </div>
              </div>

              <div className="raffleStepCard">
                <div className="raffleStepTop">
                  <div className="raffleStepTitle">Итоги в канале</div>
                  <span className="raffleStepBigNum" aria-hidden="true">
                    03
                  </span>
                </div>
                <div className="raffleStepText">Дату и победителей публикуем в канале — прозрачно и без сюрпризов.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="raffleBannerInfo" aria-label="Информация о призах">
          <div className="raffleBannerInfoTitle">Розыгрыш призов</div>
          <div className="raffleBannerInfoGrid" role="list">
            <div className="raffleBannerInfoItem" role="listitem">
              <span className="raffleBannerInfoNum">1</span>
              <span className="raffleBannerInfoText">Apple iPad</span>
            </div>
            <div className="raffleBannerInfoItem" role="listitem">
              <span className="raffleBannerInfoNum">2</span>
              <span className="raffleBannerInfoText">Apple Watch</span>
            </div>
            <div className="raffleBannerInfoItem" role="listitem">
              <span className="raffleBannerInfoNum">3</span>
              <span className="raffleBannerInfoText">Apple AirPods Pro 3</span>
            </div>
            <div className="raffleBannerInfoItem" role="listitem">
              <span className="raffleBannerInfoNum">4</span>
              <span className="raffleBannerInfoText">Apple AirPods 4</span>
            </div>
            <div className="raffleBannerInfoItem" role="listitem">
              <span className="raffleBannerInfoNum">5</span>
              <span className="raffleBannerInfoText">Сертификат на 10 000 рублей</span>
            </div>
          </div>
          <div className="cta" style={{ marginTop: 12, justifyContent: "center" }}>
            <a className="btn primary" href="https://t.me/iStore116" target="_blank" rel="noopener">
              Telegram‑канал iStore116
            </a>
            <a className="btn" href="https://t.me/iStore116/1616" target="_blank" rel="noopener">
              Пост с розыгрышем
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="tradeInInfo rafflePrizesInfo">
          <div className="tradeInFactors">
            <h2>Апрель: 5 призов</h2>
            <ul className="tradeInCheck">
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Apple iPad</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Apple Watch</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>AirPods Pro 3</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>AirPods 4</span>
              </li>
              <li>
                <span className="cb" aria-hidden="true" />
                <span>Сертификат на 10 000 ₽</span>
              </li>
            </ul>

            <div className="cta" style={{ marginTop: 12 }}>
              <a className="btn" href="/catalog/">
                Каталог (выбрать приз заранее)
              </a>
              <a className="btn" href="https://t.me/iStore116Bot" target="_blank" rel="noopener">
                Вопросы в Telegram
              </a>
            </div>
          </div>

          <div className="tradeInNote" role="note" aria-label="Важно">
            <span className="tradeInNoteIcon" aria-hidden="true">
              !
            </span>
            <div className="tradeInNoteText">
              <b>Важно.</b> Дату итогов и правила всегда публикуем в посте розыгрыша. Архив победителей — в Telegram по месяцам (в
              обновлении сделаем удобную галерею со ссылками).
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

