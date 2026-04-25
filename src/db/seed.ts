import crypto from "node:crypto";
import { getDb } from "./db";
import { migrate } from "./migrate";

function id() {
  return crypto.randomUUID();
}

export function seedIfEmpty() {
  migrate();
  const db = getDb();

  const catCount = db.prepare("SELECT COUNT(*) AS c FROM categories").get() as { c: number };
  if (catCount.c > 0) return;

  const categories = [
    { slug: "iphone", title: "iPhone", imageUrl: "/assets/71075e37-9ee6-4009-862e-e0bf9c82514a", sortOrder: 1 },
    { slug: "air-pods", title: "AirPods", imageUrl: "/assets/975099b9-5a58-45bf-a38a-37ff983f8fe1", sortOrder: 2 },
    { slug: "mac", title: "Mac", imageUrl: "/assets/f3ec2d64-21df-45ea-be75-1ace880cd186", sortOrder: 3 },
    { slug: "apple-watch", title: "Apple Watch", imageUrl: "/assets/41d5931d-6cc9-42b6-81f6-b2390a9f6a11", sortOrder: 4 },
  ];

  const insertCat = db.prepare(
    "INSERT INTO categories (id, slug, title, imageUrl, sortOrder, isHidden) VALUES (@id,@slug,@title,@imageUrl,@sortOrder,0)",
  );
  const catIds = new Map<string, string>();
  for (const c of categories) {
    const cid = id();
    catIds.set(c.slug, cid);
    insertCat.run({ id: cid, ...c });
  }

  const slides = [
    { title: "Новинки", sortOrder: 1 },
    { title: "Специальное предложение", sortOrder: 2 },
    { title: "Лучший подарок", sortOrder: 3 },
  ];
  const insertSlide = db.prepare(
    "INSERT INTO hero_slides (id, title, sortOrder, isActive) VALUES (@id,@title,@sortOrder,1)",
  );
  for (const s of slides) insertSlide.run({ id: id(), ...s });

  const products = [
    {
      slug: "iphone-17",
      title: "Apple iPhone 17 256Gb",
      subtitle: "Black, черный",
      categorySlug: "iphone",
      basePrice: 89990,
      imageUrls: ["/assets/iphone17-local.png"],
      variants: [
        {
          storageGb: 256,
          simType: "sim_esim" as const,
          colors: ["#2f3444", "#f6f7f9"],
          price: 89990,
          inStock: true,
        },
      ],
    },
    {
      slug: "iphone-17-air",
      title: "Apple iPhone 17 Air 256Gb",
      subtitle: "Silver, серебристый",
      categorySlug: "iphone",
      basePrice: 99990,
      imageUrls: ["/assets/iphone17air-local.png"],
      variants: [
        {
          storageGb: 256,
          simType: "sim_esim" as const,
          colors: ["#f6f7f9", "#2f3444"],
          price: 99990,
          inStock: true,
        },
      ],
    },
    {
      slug: "iphone-17-pro",
      title: "Apple iPhone 17 Pro 256Gb",
      subtitle: "Cosmic Orange, оранжевый",
      categorySlug: "iphone",
      basePrice: 99490,
      imageUrls: ["/assets/iphone17pro-local.png"],
      variants: [
        {
          storageGb: 256,
          simType: "sim_esim" as const,
          colors: ["#ff7a1a", "#2f3444", "#f6f7f9"],
          price: 99490,
          inStock: true,
        },
      ],
    },
    {
      slug: "iphone-17-pro-max",
      title: "Apple iPhone 17 Pro Max 256Gb",
      subtitle: "Deep Blue, тёмно-синий",
      categorySlug: "iphone",
      basePrice: 110490,
      imageUrls: ["/assets/iphone17promax-local.png"],
      variants: [
        {
          storageGb: 256,
          simType: "sim_esim" as const,
          colors: ["#2f3444", "#ff7a1a"],
          price: 110490,
          inStock: true,
        },
      ],
    },
  ];

  const insertProduct = db.prepare(
    "INSERT INTO products (id, slug, title, subtitle, categoryId, basePrice, imageUrlsJson, isActive) VALUES (@id,@slug,@title,@subtitle,@categoryId,@basePrice,@imageUrlsJson,1)",
  );
  const insertVariant = db.prepare(
    "INSERT INTO product_variants (id, productId, storageGb, simType, colorsJson, price, sku, inStock) VALUES (@id,@productId,@storageGb,@simType,@colorsJson,@price,NULL,@inStock)",
  );

  for (const p of products) {
    const pid = id();
    const categoryId = catIds.get(p.categorySlug) || Array.from(catIds.values())[0];
    insertProduct.run({
      id: pid,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      categoryId,
      basePrice: p.basePrice,
      imageUrlsJson: JSON.stringify(p.imageUrls),
    });
    for (const v of p.variants) {
      insertVariant.run({
        id: id(),
        productId: pid,
        storageGb: v.storageGb,
        simType: v.simType,
        colorsJson: JSON.stringify(v.colors),
        price: v.price,
        inStock: v.inStock ? 1 : 0,
      });
    }
  }
}

