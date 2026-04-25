"use client";

import { useEffect, useMemo, useState } from "react";

type Variant = {
  id: string;
  productId: string;
  storageGb: number;
  simType: string;
  colors: string[];
  price: number;
  sku: string | null;
  inStock: boolean;
};

type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  categoryId: string;
  categorySlug?: string;
  categoryTitle?: string;
  basePrice: number;
  imageUrls: string[];
  isActive: boolean;
  variants: Variant[];
};

type Category = { id: string; slug: string; title: string };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBasePrice, setNewBasePrice] = useState<number>(0);
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const [pRes, cRes] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/categories")]);
    if (pRes.status === 401 || cRes.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (cRes.ok) {
      const cj = await cRes.json();
      setCats((cj.data || []).map((c: any) => ({ id: c.id, slug: c.slug, title: c.title })));
    }
    if (pRes.ok) {
      const pj = await pRes.json();
      setProducts(pj.data || []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pRes, cRes] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/categories")]);
      if (pRes.status === 401 || cRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!cancelled && cRes.ok) {
        const cj = await cRes.json();
        const nextCats = (cj.data || []).map((c: any) => ({ id: c.id, slug: c.slug, title: c.title })) as Category[];
        setCats(nextCats);
        if (!newCategoryId && nextCats.length) setNewCategoryId(nextCats[0].id);
      }
      if (!cancelled && pRes.ok) {
        const pj = await pRes.json();
        setProducts(pj.data || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!newSlug.trim()) setNewSlug(slugify(newTitle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTitle]);

  async function patchProduct(id: string, data: Partial<Product>) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    await load();
  }

  async function createProduct() {
    if (creating) return;
    const slug = newSlug.trim() || slugify(newTitle);
    const title = newTitle.trim();
    if (!slug || !title || !newCategoryId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          subtitle: newSubtitle.trim(),
          categoryId: newCategoryId,
          basePrice: Number(newBasePrice || 0),
          imageUrls: [],
          isActive: true,
          variants: [],
        }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      setNewTitle("");
      setNewSlug("");
      setNewSubtitle("");
      setNewBasePrice(0);
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function delProduct(id: string) {
    if (!confirm("Удалить товар? Варианты тоже удалятся.")) return;
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    await load();
  }

  async function patchVariant(id: string, data: Partial<Variant>) {
    await fetch("/api/admin/variants", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    await load();
  }

  async function addVariant(productId: string) {
    await fetch("/api/admin/variants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, storageGb: 128, simType: "sim_esim", colors: [], price: 0, sku: null, inStock: true }),
    });
    await load();
  }

  async function delVariant(id: string) {
    await fetch(`/api/admin/variants?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function splitVariantByColors(v: Variant) {
    const colors = (v.colors || []).map((c) => c.trim()).filter(Boolean);
    if (colors.length <= 1) return;
    // Create one variant per color, then delete the original group-variant.
    for (const c of colors) {
      await fetch("/api/admin/variants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: v.productId,
          storageGb: v.storageGb,
          simType: v.simType as any,
          colors: [c],
          price: v.price,
          sku: null,
          inStock: v.inStock,
        }),
      });
    }
    await fetch(`/api/admin/variants?id=${encodeURIComponent(v.id)}`, { method: "DELETE" });
    await load();
  }

  async function splitAllProductVariants(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const toSplit = (p.variants || []).filter((v) => (v.colors || []).filter(Boolean).length > 1);
    for (const v of toSplit) {
      await splitVariantByColors(v);
    }
    await load();
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => `${p.title} ${p.slug} ${p.categoryTitle || ""}`.toLowerCase().includes(s));
  }, [products, q]);

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 12px" }}>Товары</h1>

      <div style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#111", marginBottom: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Добавить товар</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={lbl}>Название</div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={input} placeholder="Например: Apple iPhone 17 Pro Max 256Gb" />
          </div>
          <div>
            <div style={lbl}>Slug</div>
            <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} style={input} placeholder="apple-iphone-17-pro-max-256gb" />
          </div>
          <div>
            <div style={lbl}>Подзаголовок</div>
            <input value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} style={input} placeholder="Например: Cosmic Orange, оранжевый" />
          </div>
          <div>
            <div style={lbl}>Цена (base)</div>
            <input value={String(newBasePrice)} onChange={(e) => setNewBasePrice(Number(e.target.value || 0))} style={input} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={lbl}>Категория</div>
            <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} style={input}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={() => void createProduct()} disabled={creating || !newTitle.trim()} style={btnPrimary}>
            {creating ? "Создаю…" : "Добавить товар"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по товарам…" style={{ ...input, flex: 1, minWidth: 280 }} />
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          {filtered.length} / {products.length}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((p) => (
          <div key={p.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#111" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>{p.title}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>
                  slug: <span style={{ opacity: 0.9 }}>{p.slug}</span> · категория: <span style={{ opacity: 0.9 }}>{p.categoryTitle || p.categoryId}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => patchProduct(p.id, { isActive: !p.isActive })} style={btnChip(p.isActive ? "#1b1b1b" : "#3a1b1b")}>
                  {p.isActive ? "Вкл" : "Выкл"}
                </button>
                <button onClick={() => void delProduct(p.id)} style={btnDanger}>
                  Удалить
                </button>
                <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" style={btnLink}>
                  Открыть →
                </a>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={lbl}>Название</div>
                    <input value={p.title} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)))} style={input} />
                  </div>
                  <div>
                    <div style={lbl}>Цена (base)</div>
                    <input
                      value={String(p.basePrice)}
                      onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, basePrice: Number(e.target.value || 0) } : x)))}
                      style={input}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={lbl}>Slug</div>
                    <input value={p.slug} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, slug: e.target.value } : x)))} style={input} />
                  </div>
                  <div>
                    <div style={lbl}>Подзаголовок</div>
                    <input value={p.subtitle} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, subtitle: e.target.value } : x)))} style={input} />
                  </div>
                </div>

                <div>
                  <div style={lbl}>Категория</div>
                  <select value={p.categoryId} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, categoryId: e.target.value } : x)))} style={input}>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => patchProduct(p.id, { slug: p.slug, title: p.title, subtitle: p.subtitle, basePrice: p.basePrice, categoryId: p.categoryId })}
                    style={btnPrimary}
                  >
                    Сохранить товар
                  </button>
                  <button onClick={() => addVariant(p.id)} style={btnChip("#1b1b1b")}>
                    + Вариант
                  </button>
                  <button onClick={() => splitAllProductVariants(p.id)} style={btnChip("#1b1b1b")}>
                    Разделить все по цветам
                  </button>
                </div>
              </div>

              <div style={{ border: "1px solid #333", borderRadius: 14, padding: 10, background: "#161616" }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Варианты</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {p.variants.map((v) => (
                    <div key={v.id} style={{ border: "1px solid #2d2d2d", borderRadius: 12, padding: 10, background: "#111" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                        <div style={{ opacity: 0.8, fontSize: 12 }}>
                          {v.storageGb}GB · {v.simType} · {v.inStock ? "в наличии" : "нет"}
                        </div>
                        <button onClick={() => delVariant(v.id)} style={btnDanger}>
                          Удалить
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                        <div>
                          <div style={lbl}>Память (GB)</div>
                          <input
                            value={String(v.storageGb)}
                            onChange={(e) =>
                              setProducts((prev) =>
                                prev.map((x) =>
                                  x.id === p.id ? { ...x, variants: x.variants.map((vv) => (vv.id === v.id ? { ...vv, storageGb: Number(e.target.value || 0) } : vv)) } : x,
                                ),
                              )
                            }
                            style={input}
                          />
                        </div>
                        <div>
                          <div style={lbl}>Цена</div>
                          <input
                            value={String(v.price)}
                            onChange={(e) =>
                              setProducts((prev) =>
                                prev.map((x) =>
                                  x.id === p.id ? { ...x, variants: x.variants.map((vv) => (vv.id === v.id ? { ...vv, price: Number(e.target.value || 0) } : vv)) } : x,
                                ),
                              )
                            }
                            style={input}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <div style={lbl}>Цвет</div>
                        <input
                          value={String((v.colors && v.colors[0]) || "")}
                          onChange={(e) =>
                            setProducts((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? {
                                      ...x,
                                      variants: x.variants.map((vv) =>
                                        vv.id === v.id ? { ...vv, colors: [e.target.value.trim()].filter(Boolean) } : vv,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                          style={input}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button onClick={() => patchVariant(v.id, { storageGb: v.storageGb, price: v.price, colors: v.colors })} style={btnPrimarySmall}>
                          Сохранить вариант
                        </button>
                        {(v.colors || []).length > 1 ? (
                          <button onClick={() => splitVariantByColors(v)} style={btnChip("#1b1b1b")}>
                            Разделить по цветам
                          </button>
                        ) : null}
                        <button onClick={() => patchVariant(v.id, { inStock: !v.inStock })} style={btnChip(v.inStock ? "#1b1b1b" : "#3a1b1b")}>
                          {v.inStock ? "В наличии" : "Нет"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {p.variants.length === 0 ? <div style={{ opacity: 0.7, fontSize: 12 }}>Нет вариантов</div> : null}
                </div>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 ? <div style={{ opacity: 0.7 }}>Товаров пока нет.</div> : null}
      </div>
    </main>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #333",
  background: "#161616",
  color: "white",
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 };
const btnPrimary: React.CSSProperties = { padding: "10px 14px", borderRadius: 999, border: "none", background: "#ff6600", color: "white", fontWeight: 900 };
const btnPrimarySmall: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "none", background: "#ff6600", color: "white", fontWeight: 900, fontSize: 12 };
const btnDanger: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: "transparent", color: "#ff8533", fontWeight: 900, fontSize: 12 };
const btnChip = (bg: string): React.CSSProperties => ({ padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: bg, color: "white", fontWeight: 900, fontSize: 12 });
const btnLink: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "1px solid #333", background: "#1b1b1b", color: "white", fontWeight: 900, fontSize: 12, textDecoration: "none" };

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replaceAll("ё", "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

