"use client";

import { useMemo } from "react";
import { AddToCartButton } from "@/components/products/AddToCartButton";

function simLabel(t: string) {
  const m: Record<string, string> = { sim_esim: "SIM + eSIM", esim: "eSIM", sim: "SIM" };
  return m[t] || t;
}

function storageLabel(gb: number) {
  if (!Number.isFinite(gb)) return "";
  if (gb >= 1024) return `${Math.round(gb / 1024)} ТБ`;
  return `${gb} ГБ`;
}

function colorLabel(colors: string[]) {
  const c = (colors || []).map((x) => String(x || "").trim()).filter(Boolean)[0] || "";
  return c;
}

export function ProductVariantsGrid(props: {
  productId: string;
  productSlug: string;
  title: string;
  baseSubtitle: string;
  fallbackImageUrl: string | null;
  variants: Array<{
    id: string;
    storageGb: number;
    simType: string;
    colors: string[];
    imageUrl: string | null;
    price: number;
    inStock: boolean;
  }>;
}) {
  const rows = useMemo(() => {
    return (props.variants || [])
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .map((v) => {
        const mem = storageLabel(v.storageGb);
        const sim = simLabel(v.simType || "");
        const col = colorLabel(v.colors || []);
        const parts = [mem, sim, col].filter(Boolean);
        const subtitle = parts.length ? parts.join(" · ") : props.baseSubtitle;
        const img = v.imageUrl || props.fallbackImageUrl || null;
        return { v, subtitle, img, mem, sim, col };
      });
  }, [props.variants, props.baseSubtitle, props.fallbackImageUrl]);

  if (!rows.length) return <div style={{ opacity: 0.75 }}>Нет вариантов.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
      {rows.map(({ v, subtitle, img, col }) => {
        const href = `/product/${encodeURIComponent(props.productSlug)}/${encodeURIComponent(v.id)}/`;
        return (
        <div
          key={v.id}
          role="link"
          tabIndex={0}
          onClick={() => {
            window.location.href = href;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              window.location.href = href;
            }
          }}
          style={{
            border: "1px solid #2d2d2d",
            borderRadius: 24,
            overflow: "hidden",
            background: "#232323",
            boxShadow: "0 12px 36px rgba(0,0,0,.35)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              aspectRatio: "1 / 1",
              width: "100%",
              background: "#181818",
              borderBottom: "1px solid #242424",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              overflow: "hidden",
            }}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={props.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>Фото</div>
            )}
          </div>
          <div style={{ padding: "16px 18px 20px" }}>
            <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.12, marginBottom: 6, letterSpacing: "-0.2px" }}>{props.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {subtitle
                .split(" · ")
                .filter(Boolean)
                .slice(0, 2)
                .map((chip) => (
                  <span
                    key={`${v.id}-${chip}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "#efefef",
                      border: "1px solid #dfdfdf",
                      color: "#7d7d7d",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".2px",
                    }}
                  >
                    {chip}
                  </span>
                ))}
            </div>
            {col ? (
              <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800, opacity: 0.88 }}>
                Цвет: {col}
              </div>
            ) : null}
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950, fontSize: 24, color: "#ff6600", lineHeight: 1 }}>{Number(v.price || 0).toLocaleString("ru-RU")} ₽</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{v.inStock ? "В наличии" : "Нет в наличии"}</div>
            </div>
            <div style={{ marginTop: 10 }} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <AddToCartButton
                variantId={v.id}
                productId={props.productId}
                title={props.title}
                subtitle={subtitle}
                imageUrl={img}
                price={v.price}
              />
            </div>
          </div>
        </div>
        );
      })}
      </div>
      <a className="pdp-checkout-link" href="/checkout/" style={{ marginTop: 6 }}>
        Перейти к оформлению →
      </a>
    </div>
  );
}
