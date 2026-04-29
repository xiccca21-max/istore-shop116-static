import { notFound } from "next/navigation";
import { loadProductDetailBySlug } from "@/lib/productDetailData";
import { ProductDetail941 } from "./details";

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const data = await loadProductDetailBySlug(slug);
  if (!data) return notFound();

  const variants = (data.product_variants || []).slice().sort((a: { price?: number }, b: { price?: number }) => (a.price ?? 0) - (b.price ?? 0));
  const characteristicsText = typeof (data as { characteristics_text?: unknown }).characteristics_text === "string" ? (data as { characteristics_text: string }).characteristics_text.trim() : "";

  return (
    <main className="pdp-main">
      <nav className="breadcrumbs">
        <a href="/">Главная</a>
        <span className="sep">/</span>
        <a href="/catalog/">Каталог</a>
        <span className="sep">/</span>
        <span style={{ opacity: 0.95 }}>{data.title}</span>
      </nav>
      <ProductDetail941
        product={{
          id: data.id,
          slug: data.slug,
          title: data.title,
          subtitle: data.subtitle || "",
          categoryTitle: (data.categories as { title?: string } | null)?.title,
          imageUrls: Array.isArray(data.image_urls) ? data.image_urls : [],
          cardImageScale: Number((data as { card_image_scale?: unknown }).card_image_scale || 1),
          cardImagePositionX: Number((data as { card_image_position_x?: unknown }).card_image_position_x ?? 50),
          cardImagePositionY: Number((data as { card_image_position_y?: unknown }).card_image_position_y ?? 50),
          characteristicsText,
        }}
        variants={variants.map((v: Record<string, unknown>) => ({
          id: String(v.id),
          storageGb: Number(v.storage_gb),
          simType: String(v.sim_type || ""),
          colors: Array.isArray(v.colors) ? (v.colors as string[]) : [],
          imageUrl: typeof (v as any).image_url === "string" ? String((v as any).image_url) : null,
          price: Number(v.price ?? 0),
          inStock: Boolean(v.in_stock),
        }))}
      />
    </main>
  );
}
