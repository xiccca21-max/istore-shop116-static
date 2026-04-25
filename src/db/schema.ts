export type SimType = "esim" | "sim_esim" | "sim";

export type Category = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  sortOrder: number;
  isHidden: 0 | 1;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  categoryId: string;
  basePrice: number;
  imageUrlsJson: string; // JSON array of strings
  isActive: 0 | 1;
};

export type ProductVariant = {
  id: string;
  productId: string;
  storageGb: number;
  simType: SimType;
  colorsJson: string; // JSON array of hex strings
  price: number;
  sku: string | null;
  inStock: 0 | 1;
};

export type HeroSlide = {
  id: string;
  title: string;
  sortOrder: number;
  isActive: 0 | 1;
};

export type Order = {
  id: string;
  name: string;
  phone: string;
  comment: string;
  total: number;
  status: "new" | "handled";
  createdAt: string; // ISO
};

export type OrderItem = {
  id: string;
  orderId: string;
  productVariantId: string;
  qty: number;
  price: number;
};

