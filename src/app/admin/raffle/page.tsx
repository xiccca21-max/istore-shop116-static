"use client";

import { useEffect, useMemo, useState } from "react";

type Prize = {
  id: string;
  title: string;
  productId: string | null;
  sortOrder: number;
  isActive: boolean;
  product: { id: string; slug: string; title: string } | null;
};

type ApiProduct = { id: string; slug: string; title: string; subtitle: string; imageUrls: string[] };
type Report = {
  id: string;
  title: string;
  body: string;
  imageUrls: string[];
  sortOrder: number;
  isActive: boolean;
};

export default function AdminRafflePage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"product" | "custom">("product");
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);

  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<ApiProduct[]>([]);
  const [picked, setPicked] = useState<ApiProduct | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportBody, setReportBody] = useState("");
  const [reportImages, setReportImages] = useState("");
  const [reportSortOrder, setReportSortOrder] = useState<number>(10);
  const [reportIsActive, setReportIsActive] = useState(true);

  async function load() {
    const [resPrizes, resReports] = await Promise.all([
      fetch("/api/admin/raffle/prizes"),
      fetch("/api/admin/raffle/reports"),
    ]);
    if (resPrizes.status === 401 || resReports.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (resPrizes.ok) {
      const jsonPrizes = await resPrizes.json();
      setPrizes(jsonPrizes.data || []);
    }
    if (resReports.ok) {
      const jsonReports = await resReports.json();
      setReports(jsonReports.data || []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const qq = q.trim();
      if (!qq || mode !== "product") {
        setSuggest([]);
        return;
      }
      const res = await fetch(`/api/public/products?q=${encodeURIComponent(qq)}&limit=12`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      setSuggest(
        data.map((p: any) => ({
          id: String(p.id),
          slug: String(p.slug),
          title: String(p.title || ""),
          subtitle: String(p.subtitle || ""),
          imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
        })),
      );
    }, 220);
    return () => clearTimeout(t);
  }, [q, mode]);

  const pickedTitle = picked ? picked.title : "";
  const effectiveTitle = mode === "product" ? (pickedTitle || title.trim()) : title.trim();
  const parsedReportImages = parseImageUrls(reportImages);

  async function create() {
    if (!effectiveTitle) return;
    setSavingId("new");
    try {
      const res = await fetch("/api/admin/raffle/prizes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: effectiveTitle,
          productId: mode === "product" ? (picked ? picked.id : null) : null,
          sortOrder: Number(sortOrder || 0),
          isActive,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      setTitle("");
      setQ("");
      setSuggest([]);
      setPicked(null);
      setSortOrder(10);
      setIsActive(true);
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function patch(id: string, patch: Partial<Pick<Prize, "title" | "productId" | "sortOrder" | "isActive">>) {
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/raffle/prizes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function remove(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/raffle/prizes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function createReport() {
    if (!reportBody.trim()) return;
    setSavingId("report:new");
    try {
      const res = await fetch("/api/admin/raffle/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          body: reportBody.trim(),
          imageUrls: parsedReportImages,
          sortOrder: Number(reportSortOrder || 0),
          isActive: reportIsActive,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      setReportTitle("");
      setReportBody("");
      setReportImages("");
      setReportSortOrder(10);
      setReportIsActive(true);
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function patchReport(id: string, patch: Partial<Pick<Report, "title" | "body" | "imageUrls" | "sortOrder" | "isActive">>) {
    setSavingId(`report:${id}`);
    try {
      const res = await fetch("/api/admin/raffle/reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function removeReport(id: string) {
    setSavingId(`report:${id}`);
    try {
      const res = await fetch(`/api/admin/raffle/reports?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      await load();
    } finally {
      setSavingId(null);
    }
  }

  const sorted = useMemo(() => [...prizes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), [prizes]);
  const sortedReports = useMemo(() => [...reports].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), [reports]);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 16px" }}>Розыгрыш — призы</h1>

      <section style={card}>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>Добавить приз</div>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10 }}>
          <div>
            <div style={lbl}>Тип</div>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={input}>
              <option value="product">Из товаров</option>
              <option value="custom">Свой текст</option>
            </select>
          </div>
          <div>
            <div style={lbl}>Название приза</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} placeholder={mode === "product" ? "Можно оставить пустым — возьмём из товара" : "Например: Сертификат на 10 000 ₽"} />
          </div>
        </div>

        {mode === "product" ? (
          <div style={{ marginTop: 10 }}>
            <div style={lbl}>Выбрать товар</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} style={input} placeholder="Поиск по товарам…" />
            {picked ? (
              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>Выбрано:</div>
                <div style={{ opacity: 0.9 }}>{picked.title}</div>
                <button onClick={() => setPicked(null)} style={btnChip}>
                  Снять выбор
                </button>
              </div>
            ) : null}
            {suggest.length && !picked ? (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {suggest.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPicked(p)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #333",
                      background: "#111",
                      color: "white",
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{p.title}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{p.slug}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "160px 160px 1fr", gap: 10, alignItems: "end" }}>
          <div>
            <div style={lbl}>Порядок</div>
            <input value={String(sortOrder)} onChange={(e) => setSortOrder(Number(e.target.value || 0))} style={input} />
          </div>
          <div>
            <div style={lbl}>Активен</div>
            <select value={isActive ? "1" : "0"} onChange={(e) => setIsActive(e.target.value === "1")} style={input}>
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => void create()} disabled={!effectiveTitle || savingId === "new"} style={btnPrimary}>
              {savingId === "new" ? "Сохраняю…" : "Добавить приз"}
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14, ...card }}>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>Текущие призы</div>
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((p) => (
            <div key={p.id} style={{ border: "1px solid #333", borderRadius: 14, padding: 12, background: "#111" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: 950 }}>{p.title}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                    {p.product ? (
                      <>
                        товар: <span style={{ opacity: 0.9 }}>{p.product.title}</span> · <span style={{ opacity: 0.9 }}>{p.product.slug}</span>
                      </>
                    ) : (
                      "без привязки к товару"
                    )}
                  </div>
                </div>
                <button onClick={() => void remove(p.id)} disabled={savingId === p.id} style={btnDanger}>
                  Удалить
                </button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 10, alignItems: "end" }}>
                <div>
                  <div style={lbl}>Название</div>
                  <input
                    value={p.title}
                    onChange={(e) => setPrizes((prev) => prev.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)))}
                    style={input}
                  />
                </div>
                <div>
                  <div style={lbl}>Порядок</div>
                  <input
                    value={String(p.sortOrder)}
                    onChange={(e) => setPrizes((prev) => prev.map((x) => (x.id === p.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x)))}
                    style={input}
                  />
                </div>
                <div>
                  <div style={lbl}>Активен</div>
                  <select
                    value={p.isActive ? "1" : "0"}
                    onChange={(e) => setPrizes((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: e.target.value === "1" } : x)))}
                    style={input}
                  >
                    <option value="1">Да</option>
                    <option value="0">Нет</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  onClick={() => void patch(p.id, { title: p.title, sortOrder: p.sortOrder, isActive: p.isActive })}
                  disabled={savingId === p.id}
                  style={btnPrimarySmall}
                >
                  {savingId === p.id ? "Сохраняю…" : "Сохранить"}
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 ? <div style={{ opacity: 0.7 }}>Призов пока нет.</div> : null}
        </div>
      </section>

      <section style={{ marginTop: 18, ...card }}>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>Фотоотчёты розыгрышей (лента постов)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 160px", gap: 10, alignItems: "end" }}>
          <div>
            <div style={lbl}>Заголовок поста (опционально)</div>
            <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} style={input} placeholder="Например: Итоги марта 2026" />
          </div>
          <div>
            <div style={lbl}>Порядок</div>
            <input value={String(reportSortOrder)} onChange={(e) => setReportSortOrder(Number(e.target.value || 0))} style={input} />
          </div>
          <div>
            <div style={lbl}>Активен</div>
            <select value={reportIsActive ? "1" : "0"} onChange={(e) => setReportIsActive(e.target.value === "1")} style={input}>
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={lbl}>Текст отчёта</div>
          <textarea
            value={reportBody}
            onChange={(e) => setReportBody(e.target.value)}
            style={{ ...input, minHeight: 110, resize: "vertical" }}
            placeholder="Опиши итоги розыгрыша, победителей, дату и т.д."
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={lbl}>Фото (CDN ссылки, по одной в строке, до 5 штук)</div>
          <textarea
            value={reportImages}
            onChange={(e) => setReportImages(e.target.value)}
            style={{ ...input, minHeight: 110, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
            placeholder={"https://cdn.../photo-1.png\nhttps://cdn.../photo-2.png"}
          />
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>Найдено ссылок: {parsedReportImages.length} / 5</div>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => void createReport()} disabled={!reportBody.trim() || savingId === "report:new"} style={btnPrimary}>
            {savingId === "report:new" ? "Сохраняю…" : "Добавить пост в ленту"}
          </button>
        </div>
      </section>

      <section style={{ marginTop: 14, ...card }}>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>Текущие посты фотоотчётов</div>
        <div style={{ display: "grid", gap: 10 }}>
          {sortedReports.map((r) => (
            <div key={r.id} style={{ border: "1px solid #333", borderRadius: 14, padding: 12, background: "#111" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: 950 }}>{r.title || "Без заголовка"}</div>
                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>Фото: {r.imageUrls.length} / 5</div>
                </div>
                <button onClick={() => void removeReport(r.id)} disabled={savingId === `report:${r.id}`} style={btnDanger}>
                  Удалить
                </button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 10, alignItems: "end" }}>
                <div>
                  <div style={lbl}>Заголовок</div>
                  <input
                    value={r.title}
                    onChange={(e) => setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
                    style={input}
                  />
                </div>
                <div>
                  <div style={lbl}>Порядок</div>
                  <input
                    value={String(r.sortOrder)}
                    onChange={(e) => setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, sortOrder: Number(e.target.value || 0) } : x)))}
                    style={input}
                  />
                </div>
                <div>
                  <div style={lbl}>Активен</div>
                  <select
                    value={r.isActive ? "1" : "0"}
                    onChange={(e) => setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: e.target.value === "1" } : x)))}
                    style={input}
                  >
                    <option value="1">Да</option>
                    <option value="0">Нет</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={lbl}>Текст</div>
                <textarea
                  value={r.body}
                  onChange={(e) => setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, body: e.target.value } : x)))}
                  style={{ ...input, minHeight: 110, resize: "vertical" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={lbl}>Фото (CDN ссылки, по одной в строке, до 5 штук)</div>
                <textarea
                  value={r.imageUrls.join("\n")}
                  onChange={(e) =>
                    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, imageUrls: parseImageUrls(e.target.value) } : x)))
                  }
                  style={{ ...input, minHeight: 90, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
                />
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  onClick={() =>
                    void patchReport(r.id, {
                      title: r.title.trim(),
                      body: r.body.trim(),
                      imageUrls: r.imageUrls,
                      sortOrder: r.sortOrder,
                      isActive: r.isActive,
                    })
                  }
                  disabled={savingId === `report:${r.id}` || !r.body.trim()}
                  style={btnPrimarySmall}
                >
                  {savingId === `report:${r.id}` ? "Сохраняю…" : "Сохранить"}
                </button>
              </div>
            </div>
          ))}
          {sortedReports.length === 0 ? <div style={{ opacity: 0.7 }}>Постов пока нет.</div> : null}
        </div>
      </section>
    </main>
  );
}

function parseImageUrls(raw: string): string[] {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const url = normalizeCdnUrl(line);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= 5) break;
  }
  return out;
}

function normalizeCdnUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (!/^https?:$/i.test(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

const card: React.CSSProperties = { border: "1px solid #333", borderRadius: 16, padding: 12, background: "#111" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#161616", color: "white" };
const btnPrimary: React.CSSProperties = { padding: "10px 14px", borderRadius: 999, border: "none", background: "#ff6600", color: "white", fontWeight: 900 };
const btnPrimarySmall: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "none", background: "#ff6600", color: "white", fontWeight: 900, fontSize: 12 };
const btnDanger: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: "transparent", color: "#ff8533", fontWeight: 900, fontSize: 12 };
const btnChip: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: "#1b1b1b", color: "white", fontWeight: 900, fontSize: 12 };

