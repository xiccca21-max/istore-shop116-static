"use client";

import { useEffect, useMemo, useState } from "react";

type Variant = {
  id: string;
  productId: string;
  storageGb: number;
  simType: string;
  colors: string[];
  imageUrl?: string | null;
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
  cardColors: string[];
  characteristicsText: string;
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
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadMessages, setUploadMessages] = useState<Record<string, string>>({});
  const [cardColorDrafts, setCardColorDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoadError("");
    const [pResult, cResult] = await Promise.allSettled([fetch("/api/admin/products", { cache: "no-store" }), fetch("/api/admin/categories", { cache: "no-store" })]);

    if (pResult.status === "fulfilled" && pResult.value.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (cResult.status === "fulfilled" && cResult.value.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (cResult.status === "fulfilled" && cResult.value.ok) {
      const cj = await cResult.value.json();
      const nextCats = (cj.data || []).map((c: any) => ({ id: c.id, slug: c.slug, title: c.title })) as Category[];
      setCats(nextCats);
      if (!newCategoryId && nextCats.length) setNewCategoryId(nextCats[0].id);
    }

    if (pResult.status === "fulfilled" && pResult.value.ok) {
      const pj = await pResult.value.json();
      const nextProducts = Array.isArray(pj.data) ? pj.data : [];
      setProducts(nextProducts);
      setCardColorDrafts({});
    } else if (pResult.status === "fulfilled") {
      setLoadError(`Товары не загрузились (HTTP ${pResult.value.status})`);
    } else {
      setLoadError("Товары не загрузились (ошибка сети)");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setLoadError("Ошибка загрузки админки");
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
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `product_patch_failed_${res.status}`);
    }
    await load();
  }

  async function uploadImage(file: File, folder: string): Promise<string> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort("upload_timeout"), 180000);
    let res: Response;
    try {
      res = await fetch("/api/admin/upload", { method: "POST", body: fd, signal: controller.signal, cache: "no-store" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("upload_timeout");
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
    if (res.status === 401) {
      window.location.href = "/admin/login";
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const message = json?.error ? String(json.error) : `upload_failed_${res.status}`;
      throw new Error(message);
    }
    const json = await res.json();
    const url = json?.data?.url;
    if (!url || typeof url !== "string") throw new Error("upload_no_url");
    await waitForImageReady(url);
    return url;
  }

  async function uploadProductImage(productId: string, file: File) {
    const key = `product:${productId}`;
    setUploading((prev) => ({ ...prev, [key]: true }));
    setLoadError("");
    setUploadMessages((prev) => ({ ...prev, [key]: "Загружаю файл и проверяю картинку…" }));
    try {
      const url = await uploadImage(file, "products");
      setUploadMessages((prev) => ({ ...prev, [key]: "Сохраняю ссылку в товар…" }));
      await patchProduct(productId, { imageUrls: [url] });
    } catch (error) {
      setLoadError(`Картинка модели не загрузилась: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
      setUploadMessages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function uploadVariantImage(variantId: string, file: File) {
    const key = `variant:${variantId}`;
    setUploading((prev) => ({ ...prev, [key]: true }));
    setLoadError("");
    setUploadMessages((prev) => ({ ...prev, [key]: "Загружаю файл и проверяю картинку…" }));
    try {
      const url = await uploadImage(file, "variants");
      setUploadMessages((prev) => ({ ...prev, [key]: "Сохраняю ссылку в вариант…" }));
      await patchVariant(variantId, { imageUrl: url } as any);
    } catch (error) {
      setLoadError(`Картинка варианта не загрузилась: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
      setUploadMessages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
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
          basePrice: 0,
          imageUrls: [],
          cardColors: [],
          characteristicsText: "",
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
    const res = await fetch("/api/admin/variants", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `variant_patch_failed_${res.status}`);
    }
    await load();
  }

  async function addVariant(productId: string) {
    const res = await fetch("/api/admin/variants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, storageGb: 128, simType: "sim_esim", colors: [], imageUrl: null, price: 0, sku: null, inStock: true }),
    });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setLoadError(`Вариант не добавился (HTTP ${res.status})`);
      return;
    }
    const json = await res.json();
    const variant = json?.data as Variant | undefined;
    if (!variant?.id) {
      await load();
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: [variant, ...p.variants.filter((v) => v.id !== variant.id)],
            }
          : p,
      ),
    );
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

  function updateProduct(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function cardColorText(product: Product) {
    return cardColorDrafts[product.id] ?? (product.cardColors || []).join(", ");
  }

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
      {loadError ? (
        <div style={{ marginBottom: 12, border: "1px solid #6b2b2b", borderRadius: 12, padding: 10, background: "#2a1616", color: "#ffd4d4", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13 }}>{loadError}</span>
          <button onClick={() => void load()} style={btnChip("#3a1b1b")}>
            Повторить
          </button>
        </div>
      ) : null}

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

            <div style={{ marginTop: 10, display: "grid", gap: 12, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={lbl}>Название</div>
                    <input value={p.title} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)))} style={input} />
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

                <div>
                  <div style={lbl}>Цвета карточки модели</div>
                  <input
                    value={cardColorText(p)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCardColorDrafts((prev) => ({ ...prev, [p.id]: value }));
                      updateProduct(p.id, { cardColors: parseColors(value) });
                    }}
                    style={input}
                    placeholder="orange, blue, silver или #ff6600 через запятую"
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {(p.cardColors || []).map((color, idx) => (
                      <span
                        key={`${p.id}-card-color-${idx}-${color}`}
                        title={color}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,.28)",
                          background: normalizeColor(color),
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div style={lbl}>Характеристики</div>
                  <textarea
                    value={p.characteristicsText || ""}
                    onChange={(e) => updateProduct(p.id, { characteristicsText: e.target.value })}
                    style={{ ...input, minHeight: 120, resize: "vertical" }}
                    placeholder={"Например:\nДисплей: 6.3\nПроцессор: A19 Pro\nКамера: 48 МП"}
                  />
                </div>

                <div>
                  <div style={lbl}>Фото модели</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: 92,
                        height: 92,
                        borderRadius: 14,
                        border: "1px solid #2d2d2d",
                        background: "#101010",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {p.imageUrls && p.imageUrls[0] ? <img src={p.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ opacity: 0.6, fontSize: 12 }}>нет</span>}
                      {uploading[`product:${p.id}`] ? <div style={uploadOverlay}>загрузка…</div> : null}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <UploadButton
                        id={`product-image-${p.id}`}
                        label={uploading[`product:${p.id}`] ? "Загружаю фото…" : "Загрузить фото модели"}
                        disabled={Boolean(uploading[`product:${p.id}`])}
                        onSelect={async (file) => {
                          try {
                            await uploadProductImage(p.id, file);
                          } catch {
                            // ignore
                          }
                        }}
                      />
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {uploadMessages[`product:${p.id}`] || "PNG, JPG, WEBP. После выбора дождись завершения проверки."}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() =>
                      patchProduct(p.id, {
                        slug: p.slug,
                        title: p.title,
                        subtitle: p.subtitle,
                        categoryId: p.categoryId,
                        imageUrls: p.imageUrls,
                        cardColors: parseColors(cardColorText(p)),
                        characteristicsText: p.characteristicsText || "",
                      })
                    }
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
            </div>

            <div style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#161616" }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Варианты</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {p.variants.map((v) => (
                  <div key={v.id} style={{ border: "1px solid #2d2d2d", borderRadius: 24, overflow: "hidden", background: "#141414", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
                    <div style={{ height: 180, background: "#101010", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      {(v as any).imageUrl || (p.imageUrls && p.imageUrls[0]) ? (
                        <img
                          src={String((v as any).imageUrl || (p.imageUrls && p.imageUrls[0]) || "")}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ opacity: 0.6, fontSize: 12 }}>нет фото</span>
                      )}
                      {uploading[`variant:${v.id}`] ? <div style={uploadOverlay}>загрузка…</div> : null}
                    </div>

                    <div style={{ padding: 12, display: "grid", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                        <div style={{ opacity: 0.85, fontSize: 12 }}>
                          {v.storageGb}GB · {v.simType} · {v.inStock ? "в наличии" : "нет"}
                        </div>
                        <button onClick={() => delVariant(v.id)} style={btnDanger}>
                          Удалить
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div style={lbl}>SIM</div>
                          <select
                            value={String(v.simType || "sim_esim")}
                            onChange={(e) =>
                              setProducts((prev) =>
                                prev.map((x) =>
                                  x.id === p.id ? { ...x, variants: x.variants.map((vv) => (vv.id === v.id ? { ...vv, simType: e.target.value } : vv)) } : x,
                                ),
                              )
                            }
                            style={input}
                          >
                            <option value="sim_esim">SIM + eSIM</option>
                            <option value="esim">eSIM</option>
                            <option value="sim">SIM</option>
                          </select>
                        </div>
                        <div>
                          <div style={lbl}>Цвет</div>
                          <input
                            value={String((v.colors && v.colors[0]) || "")}
                            onChange={(e) =>
                              setProducts((prev) =>
                                prev.map((x) =>
                                  x.id === p.id
                                    ? {
                                        ...x,
                                        variants: x.variants.map((vv) => (vv.id === v.id ? { ...vv, colors: [e.target.value.trim()].filter(Boolean) } : vv)),
                                      }
                                    : x,
                                ),
                              )
                            }
                            style={input}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={lbl}>Фото варианта</div>
                        <UploadButton
                          id={`variant-image-${v.id}`}
                          label={uploading[`variant:${v.id}`] ? "Загружаю фото…" : "Загрузить фото варианта"}
                          disabled={Boolean(uploading[`variant:${v.id}`])}
                          onSelect={async (file) => {
                            try {
                              await uploadVariantImage(v.id, file);
                            } catch {
                              // ignore
                            }
                          }}
                        />
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                          {uploadMessages[`variant:${v.id}`] || "Кнопка загрузит файл, проверит картинку и сохранит URL."}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() =>
                            patchVariant(v.id, {
                              storageGb: v.storageGb,
                              simType: v.simType as any,
                              price: v.price,
                              colors: v.colors,
                              imageUrl: (v as any).imageUrl ?? null,
                            } as any)
                          }
                          style={btnPrimarySmall}
                        >
                          Сохранить вариант
                        </button>
                        <button onClick={() => patchVariant(v.id, { inStock: !v.inStock })} style={btnChip(v.inStock ? "#1b1b1b" : "#3a1b1b")}>
                          {v.inStock ? "В наличии" : "Нет"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {p.variants.length === 0 ? <div style={{ opacity: 0.7, fontSize: 12 }}>Нет вариантов</div> : null}
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 ? <div style={{ opacity: 0.7 }}>Товаров пока нет.</div> : null}
      </div>
    </main>
  );
}

function UploadButton(props: {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: (file: File) => Promise<void>;
}) {
  return (
    <label
      htmlFor={props.id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
        padding: "10px 16px",
        borderRadius: 999,
        border: "1px solid #ff6600",
        background: props.disabled ? "#3a2a20" : "#ff6600",
        color: "white",
        fontWeight: 950,
        cursor: props.disabled ? "wait" : "pointer",
        opacity: props.disabled ? 0.75 : 1,
        userSelect: "none",
      }}
    >
      {props.label}
      <input
        id={props.id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={props.disabled}
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file || props.disabled) return;
          await props.onSelect(file);
        }}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </label>
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
const uploadOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,.62)",
  color: "white",
  fontSize: 12,
  fontWeight: 900,
};

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replaceAll("ё", "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseColors(value: string) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,;\n]/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ).slice(0, 64);
}

async function waitForImageReady(url: string) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const timer = window.setTimeout(() => {
          img.src = "";
          reject(new Error("image_load_timeout"));
        }, 10000);
        img.onload = async () => {
          try {
            if (typeof img.decode === "function") await img.decode();
            window.clearTimeout(timer);
            resolve();
          } catch (error) {
            window.clearTimeout(timer);
            reject(error);
          }
        };
        img.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error("image_load_failed"));
        };
        img.src = `${url}${url.includes("?") ? "&" : "?"}ready=${Date.now()}-${attempt}`;
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("image_not_ready");
}

function normalizeColor(value: string) {
  const raw = String(value || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return raw;
  const dict: Record<string, string> = {
    black: "#111",
    white: "#f7f7f7",
    silver: "#c9c9c9",
    blue: "#3f6fd8",
    pink: "#f0a6c1",
    green: "#6fa56f",
    yellow: "#e4c347",
    orange: "#ff7a1a",
    purple: "#8d62c9",
    gold: "#d6b46a",
    natural: "#b7b0a6",
    graphite: "#3a3a3a",
    midnight: "#1f2530",
    starlight: "#e7dfcf",
    lavender: "#b9a7df",
    sage: "#7b8f7a",
  };
  return dict[raw.toLowerCase()] || raw || "#777";
}

