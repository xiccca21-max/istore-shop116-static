import { seedIfEmpty } from "./seed";

let didInit = false;

export function initDbOnce() {
  if (didInit) return;
  didInit = true;
  seedIfEmpty();
}

