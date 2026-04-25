"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/checkout" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span>Корзина</span>
      <span
        style={{
          minWidth: 22,
          height: 22,
          borderRadius: 999,
          background: "#ff6600",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          padding: "0 6px",
        }}
      >
        {count}
      </span>
    </Link>
  );
}

