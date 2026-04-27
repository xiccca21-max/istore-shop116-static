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

function normalizeColor(input: string) {
  const c = String(input || "").trim().toLowerCase();
  if (!c) return "#777";
  if (isHexColor(c)) return c;
  const m: Record<string, string> = {
    black: "#171717",
    white: "#f2f2f2",
    silver: "#cfd3d8",
    gray: "#8f9499",
    grey: "#8f9499",
    graphite: "#4e5257",
    blue: "#3d5fa8",
    orange: "#f28d35",
    red: "#cc2f2f",
    green: "#4f8f4f",
    pink: "#f2b5c4",
    purple: "#7d5ab5",
    yellow: "#cdb85b",
    starlight: "#efe7cd",
    midnight: "#243042",
    natural: "#d7d0c3",
    ultramarine: "#4c5fd0",
    teal: "#56b8b4",
    lavender: "#a999d6",
    sage: "#9db188",
    desert: "#b99173",
  };
  return m[c] || "#777";
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
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
      {rows.map(({ v, subtitle, img, col }) => (
        <div
          key={v.id}
          style={{
            border: "1px solid #2d2d2d",
            borderRadius: 24,
            overflow: "hidden",
            background: "#232323",
            boxShadow: "0 12px 36px rgba(0,0,0,.35)",
          }}
        >
          <div
            style={{
              height: 260,
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
              <img src={img} alt={props.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,.18)",
                    background: normalizeColor(col),
                    display: "inline-block",
                  }}
                />
              </div>
            ) : null}
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950, fontSize: 24, color: "#ff6600", lineHeight: 1 }}>{Number(v.price || 0).toLocaleString("ru-RU")} ₽</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{v.inStock ? "В наличии" : "Нет в наличии"}</div>
            </div>
            <div style={{ marginTop: 10 }}>
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
      </div>
      <a className="pdp-checkout-link" href="/checkout/" style={{ marginTop: 6 }}>
        Перейти к оформлению →
      </a>
    </div>
  );
}
