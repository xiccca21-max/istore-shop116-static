import { getDb } from "./db";

export function migrate() {
  const db = getDb();

  db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  imageUrl TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isHidden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  categoryId TEXT NOT NULL,
  basePrice INTEGER NOT NULL DEFAULT 0,
  imageUrlsJson TEXT NOT NULL DEFAULT '[]',
  isActive INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  storageGb INTEGER NOT NULL,
  simType TEXT NOT NULL,
  colorsJson TEXT NOT NULL DEFAULT '[]',
  price INTEGER NOT NULL,
  sku TEXT,
  inStock INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_variants_productId ON product_variants(productId);

CREATE TABLE IF NOT EXISTS hero_slides (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  productVariantId TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (productVariantId) REFERENCES product_variants(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
`);
}

