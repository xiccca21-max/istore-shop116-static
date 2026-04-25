import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "white" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(15,15,15,.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #222",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin" style={{ ...chip, background: "#ff6600", borderColor: "#ff6600" }}>
            Админка
          </a>
          <a href="/admin/products" style={chip}>
            Товары
          </a>
          <a href="/admin/categories" style={chip}>
            Категории
          </a>
          <a href="/admin/home" style={chip}>
            Главная
          </a>
          <a href="/admin/orders" style={chip}>
            Заявки
          </a>

          <span style={{ flex: "1 1 auto" }} />

          <a href="/" style={{ ...chip, background: "#161616" }}>
            На витрину →
          </a>
        </div>
      </header>

      {children}
    </div>
  );
}

const chip: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #333",
  background: "#1b1b1b",
  color: "white",
  fontWeight: 900,
  fontSize: 13,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

