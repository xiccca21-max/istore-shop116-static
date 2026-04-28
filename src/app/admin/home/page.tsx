"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadAdminImage } from "@/lib/adminImageUpload";

type Slide = { id: string; title: string; imageUrl?: string | null; linkUrl?: string | null; sortOrder: number; isActive: number };
type FeaturedRow = {
  id: string;
  sortOrder: number;
  isActive: number;
  product: { id: string; slug: string; title: string; subtitle: string; basePrice: number; imageUrls: string[] };
};

type ApiProduct = { id: string; slug: string; title: string; subtitle: string; basePrice: number; imageUrls: string[] };

export default function AdminHomePage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [title, setTitle] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<ApiProduct[]>([]);
  const [savingFeatured, setSavingFeatured] = useState<string | null>(null);

  async function loadHero() {
    const res = await fetch("/api/admin/hero");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setSlides(json.data || []);
  }

  async function loadFeatured() {
    const res = await fetch("/api/admin/home/featured");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setFeatured(json.data || []);
  }

  useEffect(() => {
    void loadHero();
    void loadFeatured();
  }, []);

  async function createSlide() {
    const res = await fetch("/api/admin/hero", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, sortOrder: slides.length + 1, isActive: true }),
    });
    if (res.ok) {
      setTitle("");
      await loadHero();
    }
  }

  async function toggleSlide(s: Slide) {
    await fetch("/api/admin/hero", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id, isActive: !(s.isActive === 1) }),
    });
    await loadHero();
  }

  async function deleteSlide(id: string) {
    await fetch(`/api/admin/hero?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadHero();
  }

  async function uploadSlideImage(slideId: string, file: File) {
    setUploadingId(slideId);
    try {
      const url = await uploadAdminImage(file, "hero");
      await fetch("/api/admin/hero", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: slideId, imageUrl: url }),
      });
      await loadHero();
    } finally {
      setUploadingId(null);
    }
  }

  async function patchSlide(id: string, patch: Partial<Pick<Slide, "title" | "imageUrl" | "linkUrl" | "sortOrder">> & { isActive?: boolean }) {
    const res = await fetch("/api/admin/hero", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    await loadHero();
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      const qq = q.trim();
      if (!qq) {
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
          basePrice: Number(p.basePrice || 0),
          imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
        })),
      );
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const featuredIds = useMemo(() => new Set(featured.map((f) => f.product.id)), [featured]);

  async function addFeatured(p: ApiProduct) {
    setSavingFeatured(p.id);
    try {
      const res = await fetch("/api/admin/home/featured", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: p.id }),
      });
      if (res.status === 409) return;
      if (res.ok) {
        setQ("");
        setSuggest([]);
        await loadFeatured();
      }
    } finally {
      setSavingFeatured(null);
    }
  }

  async function removeFeatured(id: string) {
    await fetch(`/api/admin/home/featured?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadFeatured();
  }

  async function patchFeatured(id: string, patch: { sortOrder?: number; isActive?: boolean }) {
    await fetch("/api/admin/home/featured", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await loadFeatured();
  }

  return (
    <main style={{ padding: 16, maxWidth: 1060, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 16px" }}>Главная</h1>

      <section style={card}>
        <div style={cardHead}>
          <div style={cardTitle}>Hero баннер</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Новый слайд"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#161616", color: "white" }}
          />
          <button onClick={createSlide} disabled={!title.trim()} style={btnPrimary}>
            Добавить
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {slides.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 10,
                alignItems: "center",
                border: "1px solid #333",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{s.title}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>order: {s.sortOrder}</div>
                <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                  <input
                    value={s.linkUrl || ""}
                    onChange={(e) =>
                      setSlides((prev) => prev.map((slide) => (slide.id === s.id ? { ...slide, linkUrl: e.target.value } : slide)))
                    }
                    placeholder="Ссылка при клике на баннер, например /catalog/iphone или https://..."
                    style={input}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => void patchSlide(s.id, { linkUrl: s.linkUrl?.trim() || null })} style={btnGhost}>
                      Сохранить ссылку
                    </button>
                    {s.linkUrl ? (
                      <a href={s.linkUrl} target="_blank" rel="noreferrer" style={btnLink}>
                        Проверить
                      </a>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={thumb} title={s.imageUrl || ""}>
                    {s.imageUrl ? <img src={s.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "no img"}
                  </div>

                  <label style={btnGhost}>
                    {uploadingId === s.id ? "Загрузка…" : "Картинка"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={uploadingId === s.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        void uploadSlideImage(s.id, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {s.imageUrl ? (
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/hero", {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ id: s.id, imageUrl: null }),
                        });
                        await loadHero();
                      }}
                      style={btnGhost}
                    >
                      Убрать
                    </button>
                  ) : null}
                </div>
              </div>
              <button onClick={() => toggleSlide(s)} style={{ ...btnGhost, background: s.isActive === 1 ? "#1b1b1b" : "#3a1b1b" }}>
                {s.isActive === 1 ? "Вкл" : "Выкл"}
              </button>
              <button onClick={() => deleteSlide(s.id)} style={{ ...btnGhost, background: "transparent", color: "#ff8533" }}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <div style={cardHead}>
          <div style={cardTitle}>Выбор покупателей</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>На главной показываются выбранные товары (как в каталоге).</div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск товара по названию / slug"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#161616", color: "white" }}
            />
            {q.trim() && suggest.length ? (
              <div style={{ border: "1px solid #333", borderRadius: 14, overflow: "hidden" }}>
                {suggest.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void addFeatured(p)}
                    disabled={featuredIds.has(p.id) || savingFeatured === p.id}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: 0,
                      borderBottom: "1px solid #222",
                      background: featuredIds.has(p.id) ? "#141414" : "#101010",
                      color: "white",
                      cursor: featuredIds.has(p.id) ? "not-allowed" : "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {p.title} <span style={{ opacity: 0.6, fontWeight: 800 }}>/{p.slug}/</span>
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      {p.subtitle} · от {formatPrice(p.basePrice)}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {featured.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 10,
                  alignItems: "center",
                  border: "1px solid #333",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={thumbSmall}>
                    {f.product.imageUrls?.[0] ? <img src={f.product.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.42)" }} /> : null}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900 }}>{f.product.title}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      /{f.product.slug}/ · от {formatPrice(f.product.basePrice)}
                    </div>
                  </div>
                </div>

                <input
                  value={String(f.sortOrder)}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || "0", 10) || 0;
                    void patchFeatured(f.id, { sortOrder: n });
                  }}
                  style={{ width: 90, padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#161616", color: "white" }}
                />

                <button onClick={() => void patchFeatured(f.id, { isActive: !(f.isActive === 1) })} style={{ ...btnGhost, background: f.isActive === 1 ? "#1b1b1b" : "#3a1b1b" }}>
                  {f.isActive === 1 ? "Вкл" : "Выкл"}
                </button>

                <button onClick={() => void removeFeatured(f.id)} style={{ ...btnGhost, background: "transparent", color: "#ff8533" }}>
                  Удалить
                </button>
              </div>
            ))}
            {!featured.length ? <div style={{ opacity: 0.7 }}>Пока не выбрано ни одного товара.</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function formatPrice(n: number) {
  try {
    return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  } catch {
    return String(n) + " ₽";
  }
}

const card: React.CSSProperties = { border: "1px solid #222", borderRadius: 16, padding: 14, marginBottom: 14, background: "#0f0f0f" };
const cardHead: React.CSSProperties = { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" };
const cardTitle: React.CSSProperties = { fontWeight: 1000, fontSize: 18 };
const btnPrimary: React.CSSProperties = { padding: "10px 14px", borderRadius: 999, border: "none", background: "#ff6600", color: "white", fontWeight: 900 };
const btnGhost: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: "#1b1b1b", color: "white", fontWeight: 900 };
const btnLink: React.CSSProperties = { ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#161616", color: "white" };
const thumb: React.CSSProperties = {
  width: 140,
  height: 60,
  borderRadius: 14,
  border: "1px solid #333",
  background: "#111",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,.5)",
  fontSize: 10,
  fontWeight: 900,
};
const thumbSmall: React.CSSProperties = { width: 54, height: 40, borderRadius: 12, border: "1px solid #333", background: "#111", overflow: "hidden" };

