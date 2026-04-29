"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

export default function CartPage() {
  const { items, remove, setQty, total, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "ok" | "err"; msg?: string }>({
    type: "idle",
  });

  const canSubmit = useMemo(() => items.length > 0 && name.trim() && phone.trim() && consent, [items.length, name, phone, consent]);

  async function submit() {
    if (!canSubmit) return;
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, comment, consent, items }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      clear();
      setName("");
      setPhone("");
      setComment("");
      setConsent(false);
      setStatus({ type: "ok", msg: "Заявка отправлена" });
    } catch (e: unknown) {
      setStatus({ type: "err", msg: e instanceof Error ? e.message : "Ошибка" });
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 20px" }}>Корзина</h1>

      {items.length === 0 ? (
        <p>Корзина пустая.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((it) => (
            <div
              key={it.variantId}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr auto",
                gap: 12,
                alignItems: "center",
                border: "1px solid #333",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: "#1b1b1b",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.42)" }} />
                ) : null}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>{it.subtitle}</div>
                <div style={{ marginTop: 6, fontWeight: 800, color: "#ff6600" }}>{it.price.toLocaleString()} ₽</div>
              </div>
              <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setQty(it.variantId, it.qty - 1)} style={btnSmall}>
                    –
                  </button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>{it.qty}</span>
                  <button onClick={() => setQty(it.variantId, it.qty + 1)} style={btnSmall}>
                    +
                  </button>
                </div>
                <button onClick={() => remove(it.variantId)} style={btnLink}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Итого: {total.toLocaleString()} ₽</div>
      </div>

      <section style={{ marginTop: 28, borderTop: "1px solid #333", paddingTop: 18 }}>
        <h2 style={{ margin: "0 0 12px" }}>Заявка</h2>
        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" style={input} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" style={input} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий"
            style={{ ...input, minHeight: 90, resize: "vertical" }}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#bfbfbf", fontSize: 12, lineHeight: 1.45 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
            <span>
              Я даю согласие на обработку персональных данных и принимаю условия{" "}
              <a href="/privacy/" target="_blank" rel="noopener" style={{ color: "#ff6600", textDecoration: "underline" }}>
                Политики конфиденциальности
              </a>
              .
            </span>
          </label>
          <button onClick={submit} disabled={!canSubmit || status.type === "loading"} style={btnPrimary}>
            {status.type === "loading" ? "Отправка..." : "Отправить"}
          </button>
          {status.type === "ok" ? <div style={{ color: "#7CFF8A" }}>{status.msg}</div> : null}
          {status.type === "err" ? <div style={{ color: "#FF6B6B" }}>{status.msg}</div> : null}
        </div>
      </section>
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
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 999,
  border: "none",
  background: "#ff6600",
  color: "white",
  fontWeight: 800,
};

const btnSmall: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#1b1b1b",
  color: "white",
  fontWeight: 800,
};

const btnLink: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#ff8533",
  fontWeight: 700,
  padding: 0,
};

