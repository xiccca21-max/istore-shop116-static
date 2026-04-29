import { notFound } from "next/navigation";
import { loadProductDetailBySlug } from "@/lib/productDetailData";
import { ProductDetail941 } from "../details";

function storageLabel(gb: number) {
  if (!Number.isFinite(gb) || gb <= 1) return "";
  if (gb >= 1024) return `${Math.round(gb / 1024)} ТБ`;
  return `${gb} ГБ`;
}

function variantTitle(productTitle: string, variant: Record<string, unknown>) {
  const parts = [
    storageLabel(Number(variant.storage_gb)),
    Array.isArray(variant.colors) ? String(variant.colors[0] || "").trim() : "",
  ].filter(Boolean);
  return parts.length ? `${productTitle} ${parts.join(" ")}` : productTitle;
}

export default async function ProductVariantPage(props: { params: Promise<{ slug: string; variantId: string }> }) {
  const { slug, variantId } = await props.params;
  const data = await loadProductDetailBySlug(slug);
  if (!data) return notFound();

  const selected = ((data.product_variants || []) as Array<Record<string, unknown>>).find((v) => String(v.id) === variantId);
  if (!selected) return notFound();

  const characteristicsText = typeof (data as { characteristics_text?: unknown }).characteristics_text === "string" ? (data as { characteristics_text: string }).characteristics_text.trim() : "";
  const title = variantTitle(data.title, selected);
  const variants = ((data.product_variants || []) as Array<Record<string, unknown>>).slice().sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));

  return (
    <main className="pdp-main">
      <nav className="breadcrumbs">
        <a href="/">Главная</a>
        <span className="sep">/</span>
        <a href="/catalog/">Каталог</a>
        <span className="sep">/</span>
        <a href={`/product/${data.slug}/`}>{data.title}</a>
        <span className="sep">/</span>
        <span style={{ opacity: 0.95 }}>{title}</span>
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
        selectedVariantId={String(selected.id)}
        variants={variants.map((v) => ({
          id: String(v.id),
          storageGb: Number(v.storage_gb),
          simType: String(v.sim_type || ""),
          colors: Array.isArray(v.colors) ? (v.colors as string[]) : [],
          imageUrl: typeof v.image_url === "string" ? String(v.image_url) : null,
          price: Number(v.price ?? 0),
          inStock: Boolean(v.in_stock),
        }))}
      />
    </main>
  );
}
