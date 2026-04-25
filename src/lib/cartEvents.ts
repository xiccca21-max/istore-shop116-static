/** Same-tab cart updates (StorageEvent only fires across tabs). */
export const CART_CHANGED_EVENT = "istore-cart-changed";

export function notifyCartChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}
