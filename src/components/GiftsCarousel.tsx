"use client";

import React, { useMemo } from "react";

type Slide = {
  title: string;
  desc: string;
  tag: string;
  imageHref: string;
};

export function GiftsCarousel() {
  const placeholderImageHref = "/assets/gift-placeholder.png";
  const airpodsImageHref = "/assets/gift-airpods.png";
  const cardholderImageHref = "/assets/gift-cardholder.png";
  const batteryPackImageHref = "/assets/gift-battery-pack.png";
  const slides: Slide[] = useMemo(
    () => [
      {
        tag: "Подарок",
        title: "AirPods",
        desc: "Музыка, звонки, шумоподавление (в зависимости от модели).",
        imageHref: airpodsImageHref,
      },
      {
        tag: "Подарок",
        title: "Кардхолдер",
        desc: "Чтобы карточка была под рукой, а не “где‑то в сумке на дне”.",
        imageHref: cardholderImageHref,
      },
      {
        tag: "Подарок",
        title: "Battery Pack",
        desc: "Когда день длинный, а розетка — короткая. Заряд — новая валюта.",
        imageHref: batteryPackImageHref,
      },
    ],
    [],
  );

  return (
    <section className="giftsCarousel" aria-label="Подарки">
      <div className="giftsViewport">
        <div className="giftsCards">
          {slides.map((card, idx) => (
            <article className="giftsCard" key={idx} aria-label={`${card.title}`}>
              <div className="giftsCardMedia" aria-hidden="true">
                <img src={card.imageHref} alt="" />
              </div>
              <div className="giftsCardBody">
                <div className="giftsCardTag">{card.tag}</div>
                <div className="giftsCardTitle">{card.title}</div>
                <div className="giftsCardDesc">{card.desc}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

