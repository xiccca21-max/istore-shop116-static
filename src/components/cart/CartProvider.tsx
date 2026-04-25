"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/cartTypes";
import { CART_CHANGED_EVENT, notifyCartChanged } from "@/lib/cartEvents";
import { loadCart, saveCart } from "@/lib/cartStorage";

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "istore_cart_v1") setItems(loadCart());
    }
    function onSameTabCart() {
      setItems((prev) => {
        const next = loadCart();
        try {
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        } catch {
          /* ignore */
        }
        return next;
      });
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_CHANGED_EVENT, onSameTabCart);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_CHANGED_EVENT, onSameTabCart);
    };
  }, []);

  useEffect(() => {
    saveCart(items);
    notifyCartChanged();
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    function add(item: Omit<CartItem, "qty">, qty = 1) {
      setItems((prev) => {
        const next = [...prev];
        const idx = next.findIndex((x) => x.variantId === item.variantId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], qty: next[idx].qty + qty };
          return next;
        }
        next.push({ ...item, qty });
        return next;
      });
    }

    function remove(variantId: string) {
      setItems((prev) => prev.filter((x) => x.variantId !== variantId));
    }

    function setQty(variantId: string, qty: number) {
      setItems((prev) =>
        prev
          .map((x) => (x.variantId === variantId ? { ...x, qty: Math.max(1, Math.floor(qty || 1)) } : x))
          .filter((x) => x.qty > 0),
      );
    }

    function clear() {
      setItems([]);
    }

    const total = items.reduce((sum, x) => sum + x.price * x.qty, 0);
    const count = items.reduce((sum, x) => sum + x.qty, 0);
    return { items, add, remove, setQty, clear, total, count };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

