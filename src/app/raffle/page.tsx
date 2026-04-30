import { SiteFooter } from "@/components/SiteFooter";
import { supabaseAnon } from "@/lib/supabaseServer";
import { SiteHeader } from "@/components/SiteHeader";
import { RaffleReportsFeed, type RaffleReportView } from "@/components/raffle/RaffleReportsFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RafflePrizeDisplay = {
  label: string;
  /** Первое изображение из карточки товара в каталоге */
  imageUrl: string | null;
  /** Ссылка на страницу товара, если приз привязан к товару */
  productHref: string | null;
};

function firstProductImageUrl(raw: unknown): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const u = raw[0];
  return typeof u === "string" && u.trim() ? u.trim() : null;
}

async function getPrizes(): Promise<RafflePrizeDisplay[]> {
  try {
    const sb = supabaseAnon();
    const { data, error } = await sb
      .from("raffle_prizes")
      .select("title,is_active,sort_order,products:product_id(slug,title,image_urls)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) return [];
    const rows = (data || []) as unknown as Array<{
      title: string | null;
      products: { slug: string; title: string; image_urls: unknown } | null;
    }>;
    const out: RafflePrizeDisplay[] = [];
    for (const r of rows) {
      const label = (r.title || r.products?.title || "").trim();
      if (!label) continue;
      const slug = r.products?.slug?.trim();
      const imageUrl = firstProductImageUrl(r.products?.image_urls ?? null);
      const productHref = slug ? `/product/${encodeURIComponent(slug)}/` : null;
      out.push({ label, imageUrl, productHref });
    }
    return out;
  } catch {
    return [];
  }
}

async function getReports(): Promise<RaffleReportView[]> {
  try {
    const sb = supabaseAnon();
    const { data, error } = await sb
      .from("raffle_reports")
      .select("id,title,body,image_urls,is_active,sort_order,created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    const rows = (data || []) as Array<{
      id: string;
      title: string | null;
      body: string | null;
      image_urls: unknown;
    }>;
    const out: RaffleReportView[] = [];
    for (const row of rows) {
      const body = String(row.body || "").trim();
      if (!body) continue;
      const imageUrls = Array.isArray(row.image_urls)
        ? row.image_urls
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, 5)
        : [];
      out.push({
        id: row.id,
        title: String(row.title || "").trim(),
        body,
        imageUrls,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export default async function RafflePage() {
  const list = (await getPrizes()) || [];
  const reports = (await getReports()) || [];
  return (
    <div className="page promoPage">
      <SiteHeader />

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
          {list.length ? (
            <div className="raffleBannerInfoGrid" role="list">
              {list.slice(0, 9).map((p, idx) => {
                const cardInner = (
                  <>
                    <span className="rafflePrizeCardBadge" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <div className="rafflePrizeCardMedia">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="rafflePrizeCardPlaceholder">Фото позже</span>
                      )}
                    </div>
                    <div className="rafflePrizeCardBody">
                      <div className="rafflePrizeCardTitle">{p.label}</div>
                    </div>
                  </>
                );
                return p.productHref ? (
                  <a key={idx} href={p.productHref} className="rafflePrizeCard rafflePrizeCard--link" role="listitem">
                    {cardInner}
                  </a>
                ) : (
                  <div key={idx} className="rafflePrizeCard" role="listitem">
                    {cardInner}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: 12 }}>
              Призы скоро появятся
            </div>
          )}
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
            <h2>{list.length ? `Призы: ${list.length}` : "Призы скоро появятся"}</h2>
            {list.length ? (
              <ul className="tradeInCheck rafflePrizeList">
                {list.map((p, idx) => (
                  <li key={idx}>
                    {p.imageUrl ? (
                      <span className="rafflePrizeRowThumb" aria-hidden="true">
                        <img src={p.imageUrl} alt="" loading="lazy" decoding="async" />
                      </span>
                    ) : null}
                    <span className="rafflePrizeRowTitle">
                      {p.productHref ? (
                        <a href={p.productHref}>{p.label}</a>
                      ) : (
                        p.label
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#d7d7d7", lineHeight: 1.6, margin: 0 }}>Список призов подтянется из админки, когда появятся активные позиции.</p>
            )}

            <div className="cta" style={{ marginTop: 12 }}>
              <a className="btn" href="/catalog/">
                Каталог
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

      <RaffleReportsFeed reports={reports} />

      <SiteFooter />
    </div>
  );
}

