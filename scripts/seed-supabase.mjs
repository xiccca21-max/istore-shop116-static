import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "images";

if (!url || !service) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

async function upsertCategories() {
  const categories = [
    { slug: "iphone", title: "iPhone", image_url: "/assets/71075e37-9ee6-4009-862e-e0bf9c82514a", sort_order: 1, is_hidden: false },
    { slug: "air-pods", title: "AirPods", image_url: "/assets/975099b9-5a58-45bf-a38a-37ff983f8fe1", sort_order: 2, is_hidden: false },
    { slug: "mac", title: "Mac", image_url: "/assets/f3ec2d64-21df-45ea-be75-1ace880cd186", sort_order: 3, is_hidden: false },
    { slug: "apple-watch", title: "Apple Watch", image_url: "/assets/41d5931d-6cc9-42b6-81f6-b2390a9f6a11", sort_order: 4, is_hidden: false },
  ];
  const { data, error } = await sb.from("categories").upsert(categories, { onConflict: "slug" }).select("id,slug");
  if (error) throw error;
  const map = new Map(data.map((x) => [x.slug, x.id]));
  return map;
}

async function upsertHero() {
  const slides = [
    { title: "Новинки", sort_order: 1, is_active: true },
    { title: "Специальное предложение", sort_order: 2, is_active: true },
    { title: "Лучший подарок", sort_order: 3, is_active: true },
  ];
  // If unique index on title doesn't exist, fallback to delete+insert.
  const { error: delErr } = await sb.from("hero_slides").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;
  const { error: insErr } = await sb.from("hero_slides").insert(slides);
  if (insErr) throw insErr;
}

async function upsertProducts(categoryIds) {
  const products = [
    {
      slug: "iphone-17",
      title: "Apple iPhone 17 256Gb",
      subtitle: "Black, черный",
      category_id: categoryIds.get("iphone"),
      base_price: 89990,
      image_urls: ["/assets/iphone17-local.png"],
      is_active: true,
      variants: [{ storage_gb: 256, sim_type: "sim_esim", colors: ["#2f3444", "#f6f7f9"], price: 89990, in_stock: true }],
    },
    {
      slug: "iphone-17-air",
      title: "Apple iPhone 17 Air 256Gb",
      subtitle: "Silver, серебристый",
      category_id: categoryIds.get("iphone"),
      base_price: 99990,
      image_urls: ["/assets/iphone17air-local.png"],
      is_active: true,
      variants: [{ storage_gb: 256, sim_type: "sim_esim", colors: ["#f6f7f9", "#2f3444"], price: 99990, in_stock: true }],
    },
    {
      slug: "iphone-17-pro",
      title: "Apple iPhone 17 Pro 256Gb",
      subtitle: "Cosmic Orange, оранжевый",
      category_id: categoryIds.get("iphone"),
      base_price: 99490,
      image_urls: ["/assets/iphone17pro-local.png"],
      is_active: true,
      variants: [{ storage_gb: 256, sim_type: "sim_esim", colors: ["#ff7a1a", "#2f3444", "#f6f7f9"], price: 99490, in_stock: true }],
    },
    {
      slug: "iphone-17-pro-max",
      title: "Apple iPhone 17 Pro Max 256Gb",
      subtitle: "Deep Blue, тёмно-синий",
      category_id: categoryIds.get("iphone"),
      base_price: 110490,
      image_urls: ["/assets/iphone17promax-local.png"],
      is_active: true,
      variants: [{ storage_gb: 256, sim_type: "sim_esim", colors: ["#2f3444", "#ff7a1a"], price: 110490, in_stock: true }],
    },
  ];

  for (const p of products) {
    const { data: prod, error } = await sb
      .from("products")
      .upsert(
        {
          slug: p.slug,
          title: p.title,
          subtitle: p.subtitle,
          category_id: p.category_id,
          base_price: p.base_price,
          image_urls: p.image_urls,
          is_active: p.is_active,
        },
        { onConflict: "slug" },
      )
      .select("id,slug")
      .single();
    if (error) throw error;

    // Replace variants for the product (simple MVP behavior).
    const { error: delErr } = await sb.from("product_variants").delete().eq("product_id", prod.id);
    if (delErr) throw delErr;
    const variants = p.variants.map((v) => ({ ...v, product_id: prod.id }));
    const { error: insErr } = await sb.from("product_variants").insert(variants);
    if (insErr) throw insErr;
  }
}

async function ensureBucketPublic() {
  // Bucket already created by user; we only log reminder.
  console.log("Bucket:", bucket, "(ensure it is Public in Supabase Storage)");
}

async function main() {
  await ensureBucketPublic();
  const catIds = await upsertCategories();
  await upsertHero();
  await upsertProducts(catIds);
  console.log("Seed OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

