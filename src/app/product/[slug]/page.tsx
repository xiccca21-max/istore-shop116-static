import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabaseServer";
import { ProductVariantsGrid } from "./ui";

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
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

  let result = await sb
    .from("products")
    .select(fullSelect)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (result.error && result.error.message.includes("characteristics_text")) {
    result = await sb.from("products").select(legacySelect).eq("slug", slug).limit(1).maybeSingle();
  }
  const { data, error } = result;

  if (error || !data) return notFound();

  const variants = (data.product_variants || []).slice().sort((a: { price?: number }, b: { price?: number }) => (a.price ?? 0) - (b.price ?? 0));

  // PDP hero is configured separately from product model images.
  // Do not bind hero to admin model `image_urls`.
  const heroImage: string | null = null;
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

      <section className="pdp-hero" aria-label="Фото товара">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt={data.title} />
        ) : (
          <div className="pdp-gallery-empty">
            Хиро баннер будет настроен отдельно
          </div>
        )}
        <div className="pdp-hero-title">
          <h1 className="pdp-h1">{data.title}</h1>
        </div>
      </section>

      <section className="pdp-buy" style={{ marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85, marginBottom: 10, letterSpacing: 0.2 }}>Варианты</div>
          <ProductVariantsGrid
            productId={data.id}
            title={data.title}
            baseSubtitle={data.subtitle || ""}
            fallbackImageUrl={null}
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
        </div>

        <div className="pdp-badges">
          <a className="pdp-badge" href="/trade-in/">
            <div className="pdp-badge-title">Trade-In</div>
            <div className="pdp-badge-text">Обменяй старое устройство на новое</div>
          </a>
          <a className="pdp-badge" href="/installment/">
            <div className="pdp-badge-title">Рассрочка</div>
            <div className="pdp-badge-text">Уточним условия в магазине</div>
          </a>
        </div>
      </section>

      {characteristicsText ? (
        <section className="pdp-characteristics" aria-label="Характеристики товара">
          <h2>Характеристики</h2>
          <div className="pdp-characteristics-text">{characteristicsText}</div>
        </section>
      ) : null}
    </main>
  );
}
