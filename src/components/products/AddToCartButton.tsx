"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

export function AddToCartButton(props: {
  variantId: string;
  productId: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  price: number;
}) {
  const cart = useCart();
  const [flash, setFlash] = useState(false);
  const disabled = !props.variantId || !props.productId;

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          cart.add({
            variantId: props.variantId,
            productId: props.productId,
            title: props.title,
            subtitle: props.subtitle,
            imageUrl: props.imageUrl,
            price: Math.max(0, Math.floor(Number(props.price) || 0)),
          });
          setFlash(true);
          window.setTimeout(() => setFlash(false), 1400);
        }}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 999,
          border: "none",
          background: disabled ? "#444" : "#ff6600",
          color: "white",
          fontWeight: 900,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {flash ? "Добавлено" : "В корзину"}
      </button>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65, minHeight: 16 }} aria-live="polite">
        {flash ? "Товар в корзине — можно перейти к оформлению." : ""}
      </div>
    </div>
  );
}

