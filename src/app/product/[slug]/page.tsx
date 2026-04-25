import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabaseServer";
import { ProductBuyBox } from "./ui";

function simLabel(t: string) {
  const m: Record<string, string> = { sim_esim: "SIM + eSIM", esim: "eSIM", sim: "SIM" };
  return m[t] || t;
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const sb = supabaseService();

  const { data, error } = await sb
    .from("products")
    .select(
      `
      id,slug,title,subtitle,base_price,image_urls,
      categories:category_id ( slug,title ),
      product_variants ( id, storage_gb, sim_type, colors, price, sku, in_stock )
    `,
    )
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return notFound();

  const row = data as typeof data & { categories?: { title?: string } | null };
  const categoryTitle = row.categories && typeof row.categories === "object" && "title" in row.categories ? row.categories.title : null;

  const variants = (data.product_variants || []).slice().sort((a: { price?: number }, b: { price?: number }) => (a.price ?? 0) - (b.price ?? 0));
  const minPrice = variants.length ? Math.min(...variants.map((v: { price?: number }) => v.price ?? data.base_price ?? 0)) : data.base_price ?? 0;

  const rawUrls = data.image_urls;
  const imageUrls: string[] = Array.isArray(rawUrls) ? (rawUrls as string[]).filter(Boolean) : [];
  const heroImage = imageUrls[0] ?? null;

  return (
    <main className="pdp-main">
      <nav className="breadcrumbs">
        <a href="/">Главная</a>
        <span className="sep">/</span>
        <a href="/catalog/">Каталог</a>
        <span className="sep">/</span>
        <span style={{ opacity: 0.95 }}>{data.title}</span>
      </nav>

      <div className="pdp-grid">
        <section className="pdp-gallery" aria-label="Фото товара">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={data.title} />
          ) : (
            <div className="pdp-gallery-empty">
              Фото скоро появится
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, opacity: 0.75 }}>Сейчас в базе может не быть картинки — можно загрузить в админке</div>
            </div>
          )}
        </section>

        <aside className="pdp-buy">
          <div className="pdp-cat-pill">{categoryTitle || "Товар"}</div>
          <h1 className="pdp-h1">{data.title}</h1>
          {data.subtitle ? <div className="pdp-sub">{data.subtitle}</div> : null}

          <div className="pdp-price-row">
            <div className="pdp-price-label">от</div>
            <div className="pdp-price-value">{Number(minPrice).toLocaleString("ru-RU")} ₽</div>
          </div>

          {variants[0] ? (
            <div className="pdp-meta">
              <span className="pdp-chip">{simLabel(String(variants[0].sim_type || ""))}</span>
            </div>
          ) : null}

          <ProductBuyBox
            productId={data.id}
            title={data.title}
            subtitle={data.subtitle || ""}
            imageUrl={heroImage}
            variants={variants.map((v: Record<string, unknown>) => ({
              id: String(v.id),
              storageGb: Number(v.storage_gb),
              simType: String(v.sim_type || ""),
              colors: Array.isArray(v.colors) ? (v.colors as string[]) : [],
              price: Number(v.price ?? 0),
              inStock: Boolean(v.in_stock),
            }))}
          />

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
        </aside>
      </div>
    </main>
  );
}
