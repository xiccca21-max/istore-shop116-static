"use client";

import { useMemo, useState } from "react";

export type RaffleReportView = {
  id: string;
  title: string;
  body: string;
  imageUrls: string[];
};

type Props = {
  reports: RaffleReportView[];
};

export function RaffleReportsFeed({ reports }: Props) {
  if (!reports.length) return null;
  return (
    <section className="section">
      <div className="raffleReports" aria-label="Фотоотчёты розыгрышей">
        <h2>Фотоотчёты розыгрышей</h2>
        <div className="raffleReportsList">
          {reports.map((report) => (
            <RaffleReportPost key={report.id} report={report} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RaffleReportPost({ report }: { report: RaffleReportView }) {
  const images = useMemo(() => (Array.isArray(report.imageUrls) ? report.imageUrls.filter(Boolean).slice(0, 5) : []), [report.imageUrls]);
  const [index, setIndex] = useState(0);
  const [swipe, setSwipe] = useState<{ active: boolean; startX: number; startY: number; locked: boolean }>({
    active: false,
    startX: 0,
    startY: 0,
    locked: false,
  });
  const canSlide = images.length > 1;

  function go(next: number) {
    if (!images.length) return;
    setIndex((next + images.length) % images.length);
  }

  function onStart(x: number, y: number) {
    if (!canSlide) return;
    setSwipe({ active: true, startX: x, startY: y, locked: false });
  }

  function onMove(x: number, y: number, ev?: { cancelable?: boolean; preventDefault?: () => void }) {
    if (!swipe.active || !canSlide) return;
    const dx = x - swipe.startX;
    const dy = y - swipe.startY;
    if (!swipe.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      const nextLocked = Math.abs(dx) > Math.abs(dy);
      setSwipe((prev) => ({ ...prev, locked: nextLocked }));
      if (!nextLocked) return;
    }
    if (ev && ev.cancelable && ev.preventDefault) ev.preventDefault();
  }

  function onEnd(x: number) {
    if (!swipe.active || !canSlide) return;
    const dx = x - swipe.startX;
    setSwipe((prev) => ({ ...prev, active: false }));
    if (Math.abs(dx) < 34) return;
    go(index + (dx < 0 ? 1 : -1));
  }

  return (
    <article className="raffleReportPost">
      <div
        className="raffleReportCarousel"
        onTouchStart={(e) => {
          const t = e.touches && e.touches[0];
          if (t) onStart(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches && e.touches[0];
          if (t) onMove(t.clientX, t.clientY, e);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches && e.changedTouches[0];
          if (t) onEnd(t.clientX);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          onStart(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => onMove(e.clientX, e.clientY, e)}
        onPointerUp={(e) => onEnd(e.clientX)}
        onPointerCancel={() => setSwipe((prev) => ({ ...prev, active: false }))}
      >
        {images.length ? (
          <img src={images[index]} alt={report.title || "Фотоотчёт розыгрыша"} loading="lazy" decoding="async" />
        ) : (
          <div className="raffleReportPlaceholder">Фото появятся позже</div>
        )}

        {canSlide ? (
          <>
            <button className="raffleReportArrow raffleReportArrowPrev" onClick={() => go(index - 1)} aria-label="Предыдущее фото">
              ‹
            </button>
            <button className="raffleReportArrow raffleReportArrowNext" onClick={() => go(index + 1)} aria-label="Следующее фото">
              ›
            </button>
            <div className="raffleReportDots">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={`raffleReportDot${idx === index ? " is-active" : ""}`}
                  aria-label={`Фото ${idx + 1}`}
                  onClick={() => go(idx)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {report.title ? <h3>{report.title}</h3> : null}
    </article>
  );
}

