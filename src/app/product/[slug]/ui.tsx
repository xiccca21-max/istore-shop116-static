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

function isHexColor(s: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
}

export function ProductVariantsGrid(props: {
  productId: string;
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
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map(({ v, subtitle, img, col }) => (
        <div
          key={v.id}
          style={{
            border: "1px solid #2d2d2d",
            borderRadius: 18,
            overflow: "hidden",
            background: "#121212",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, padding: 12, alignItems: "center" }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 14,
                background: "#181818",
                border: "1px solid #242424",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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

            <div>
              <div style={{ fontWeight: 950, fontSize: 14, lineHeight: 1.15 }}>{subtitle}</div>
              {col && isHexColor(col) ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, opacity: 0.85, fontSize: 12 }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: col,
                      border: "1px solid rgba(255,255,255,.2)",
                      display: "inline-block",
                    }}
                  />
                  <span>{col}</span>
                </div>
              ) : null}
              <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 950, fontSize: 18, color: "#ff6600" }}>{Number(v.price || 0).toLocaleString("ru-RU")} ₽</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{v.inStock ? "В наличии" : "Нет в наличии"}</div>
              </div>
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
      ))}
      <a className="pdp-checkout-link" href="/checkout/" style={{ marginTop: 6 }}>
        Перейти к оформлению →
      </a>
    </div>
  );
}
