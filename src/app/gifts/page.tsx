import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { GiftsCarousel } from "@/components/GiftsCarousel";

export default function GiftsPage() {
  return (
    <div className="page promoPage">
      <SiteHeader />

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

