"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Неверный пароль");
      window.location.href = "/admin";
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 16px" }}>Админка</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>Вход по паролю.</p>
      <div style={{ display: "grid", gap: 10 }}>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          type="password"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #333",
            background: "#161616",
            color: "white",
          }}
        />
        <button
          onClick={submit}
          disabled={!password.trim() || loading}
          style={{
            padding: "12px 16px",
            borderRadius: 999,
            border: "none",
            background: "#ff6600",
            color: "white",
            fontWeight: 800,
          }}
        >
          {loading ? "Вход..." : "Войти"}
        </button>
        {err ? <div style={{ color: "#ff6b6b" }}>{err}</div> : null}
      </div>
    </main>
  );
}

