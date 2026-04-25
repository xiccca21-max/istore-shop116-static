"use client";

import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/products/AddToCartButton";

export function ProductBuyBox(props: {
  productId: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  variants: Array<{
    id: string;
    storageGb: number;
    simType: string;
    colors: string[];
    price: number;
    inStock: boolean;
  }>;
}) {
  const storages = useMemo(() => {
    const s = Array.from(new Set(props.variants.map((v) => v.storageGb))).filter((n) => Number.isFinite(n));
    s.sort((a, b) => a - b);
    return s;
  }, [props.variants]);

  const colors = useMemo(() => {
    const c = Array.from(new Set(props.variants.flatMap((v) => v.colors || []))).filter(Boolean);
    c.sort((a, b) => a.localeCompare(b));
    return c;
  }, [props.variants]);

  const [storageGb, setStorageGb] = useState<number>(storages[0] ?? 1);
  const [color, setColor] = useState<string>(colors[0] ?? "");

  useEffect(() => {
    const pool = props.variants.filter((v) => v.storageGb === storageGb);
    const avail = Array.from(new Set(pool.flatMap((v) => v.colors || []).filter(Boolean)));
    setColor((prev) => {
      if (avail.length === 0) return "";
      if (prev && avail.includes(prev)) return prev;
      return avail[0] || "";
    });
  }, [storageGb, props.variants]);

  const selected = useMemo(() => {
    const pool = props.variants.filter((v) => v.storageGb === storageGb);
    if (!pool.length) return props.variants[0] || null;
    if (color) {
      const ex = pool.find((v) => (v.colors || []).includes(color));
      if (ex) return ex;
    }
    return pool[0] || null;
  }, [props.variants, storageGb, color]);

  if (!selected) {
    return <div style={{ marginTop: 12, opacity: 0.75 }}>Нет вариантов.</div>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      {storages.length > 1 ? (
        <div style={{ marginTop: 10 }}>
          <div style={label}>Объем памяти</div>
          <div style={chipsRow}>
            {storages.map((s) => (
              <button key={s} type="button" onClick={() => setStorageGb(s)} style={chip(s === storageGb)}>
                {s >= 1024 ? `${Math.round(s / 1024)} ТБ` : `${s} ГБ`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {colors.length ? (
        <div style={{ marginTop: 12 }}>
          <div style={label}>Цвет</div>
          <div style={chipsRow}>
            {colors.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} style={chip(c === color)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AddToCartButton
        variantId={selected.id}
        productId={props.productId}
        title={props.title}
        subtitle={props.subtitle}
        imageUrl={props.imageUrl}
        price={selected.price}
      />

      <a className="pdp-checkout-link" href="/checkout/">
        Перейти к оформлению →
      </a>
    </div>
  );
}

const label: React.CSSProperties = { fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 8, letterSpacing: 0.2 };
const chipsRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const chip = (active: boolean): React.CSSProperties => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${active ? "#ff6600" : "#333"}`,
  background: active ? "rgba(255,102,0,.12)" : "#161616",
  color: "white",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
});
