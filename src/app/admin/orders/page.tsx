"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  name: string;
  phone: string;
  comment: string;
  total: number;
  status: "new" | "handled";
  createdAt: string;
  items: Array<{ id: string; productVariantId: string; qty: number; price: number; storageGb: number; simType: string }>;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    const res = await fetch("/api/admin/orders");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setOrders(json.data || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (!cancelled) setOrders(json.data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: "new" | "handled") {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 16px" }}>Заявки</h1>
      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((o) => (
          <div key={o.id} style={{ border: "1px solid #333", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {o.name} · <span style={{ color: "#ff8533" }}>{o.phone}</span>
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {new Date(o.createdAt).toLocaleString()} · id {o.id.slice(0, 8)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{Number(o.total).toLocaleString()} ₽</div>
                <button
                  onClick={() => setStatus(o.id, o.status === "new" ? "handled" : "new")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid #333",
                    background: o.status === "handled" ? "#1f3a24" : "#1b1b1b",
                    color: "white",
                    fontWeight: 900,
                  }}
                >
                  {o.status === "new" ? "Новая" : "Обработана"}
                </button>
              </div>
            </div>
            {o.comment ? <div style={{ marginTop: 10, opacity: 0.85 }}>{o.comment}</div> : null}
            <div style={{ marginTop: 12, display: "grid", gap: 6, opacity: 0.9 }}>
              {o.items.map((it) => (
                <div key={it.id} style={{ fontSize: 13 }}>
                  {it.qty} × {it.price.toLocaleString()} ₽ · variant {it.productVariantId.slice(0, 8)} · {it.storageGb}GB ·{" "}
                  {it.simType}
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 ? <div style={{ opacity: 0.7 }}>Заявок пока нет.</div> : null}
      </div>
    </main>
  );
}

