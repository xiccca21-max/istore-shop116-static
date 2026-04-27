import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabaseServer";
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
  const sb = supabaseService();

  const fullSelect = `
      id,slug,title,subtitle,base_price,image_urls,characteristics_text,
      categories:category_id ( slug,title ),
      product_variants ( id, storage_gb, sim_type, colors, image_url, price, sku, in_stock )
    `;
  const legacySelect = `
      id,slug,title,subtitle,base_price,image_urls,
      categories:category_id ( slug,title ),
      product_variants ( id, storage_gb, sim_type, colors, image_url, price, sku, in_stock )
    `;

  let result = await sb.from("products").select(fullSelect).eq("slug", slug).limit(1).maybeSingle();
  if (result.error && result.error.message.includes("characteristics_text")) {
    result = await sb.from("products").select(legacySelect).eq("slug", slug).limit(1).maybeSingle();
  }
  const { data, error } = result;
  if (error || !data) return notFound();

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
