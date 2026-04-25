"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  sortOrder: number;
  isHidden: boolean;
};

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/categories");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setRows(json.data || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/categories");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (!cancelled) setRows(json.data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, title, sortOrder: rows.length + 1, isHidden: false }),
      });
      if (res.ok) {
        setSlug("");
        setTitle("");
        await load();
      }
    } finally {
      setLoading(false);
    }
  }

  async function patch(id: string, data: Partial<Category>) {
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    await load();
  }

  async function uploadCategoryImage(categoryId: string, file: File) {
    setUploadingId(categoryId);
    try {
      const fd = new FormData();
      fd.set("folder", "categories");
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) return;
      const url = json?.data?.url as string | undefined;
      if (url) await patch(categoryId, { imageUrl: url });
    } finally {
      setUploadingId(null);
    }
  }

  async function del(id: string) {
    await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 16px" }}>Категории</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug (например samsung)" style={input} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" style={input} />
        <button onClick={create} disabled={loading || !slug.trim() || !title.trim()} style={btnPrimary}>
          Добавить
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #333",
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>{c.title}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{c.slug}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 64,
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #333",
                    background: "#111",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,.5)",
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                  title={c.imageUrl || ""}
                >
                  {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "no img"}
                </div>

                <label style={btnChip("#1b1b1b")}>
                  {uploadingId === c.id ? "Загрузка…" : "Картинка"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={uploadingId === c.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      void uploadCategoryImage(c.id, f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {c.imageUrl ? (
                  <button onClick={() => patch(c.id, { imageUrl: null })} style={btnChip("#1b1b1b")}>
                    Убрать
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={() => patch(c.id, { isHidden: !c.isHidden })} style={btnChip(c.isHidden ? "#3a1b1b" : "#1b1b1b")}>
                {c.isHidden ? "Скрыта" : "Видна"}
              </button>
              <button onClick={() => patch(c.id, { sortOrder: Math.max(0, c.sortOrder - 1) })} style={btnChip("#1b1b1b")}>
                ↑
              </button>
              <button onClick={() => patch(c.id, { sortOrder: c.sortOrder + 1 })} style={btnChip("#1b1b1b")}>
                ↓
              </button>
            </div>

            <div style={{ opacity: 0.7, fontSize: 12, textAlign: "right" }}>order: {c.sortOrder}</div>

            <button onClick={() => del(c.id)} style={btnDanger}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #333",
  background: "#161616",
  color: "white",
};

const btnPrimary: React.CSSProperties = { padding: "12px 16px", borderRadius: 999, border: "none", background: "#ff6600", color: "white", fontWeight: 900 };
const btnDanger: React.CSSProperties = { padding: "10px 14px", borderRadius: 999, border: "1px solid #333", background: "transparent", color: "#ff8533", fontWeight: 900 };
const btnChip = (bg: string): React.CSSProperties => ({ padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: bg, color: "white", fontWeight: 900 });

