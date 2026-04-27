import { AddToCartButton } from "@/components/products/AddToCartButton";

export type ProductDetailVariant = {
  id: string;
  storageGb: number;
  simType: string;
  colors: string[];
  imageUrl: string | null;
  price: number;
  inStock: boolean;
};

export type ProductDetailProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  categoryTitle?: string;
  imageUrls: string[];
  characteristicsText: string;
};

function storageLabel(gb: number) {
  if (!Number.isFinite(gb) || gb <= 1) return "";
  if (gb >= 1024) return `${Math.round(gb / 1024)} ТБ`;
  return `${gb} ГБ`;
}

function simLabel(value: string) {
  const map: Record<string, string> = { esim: "eSIM", sim: "SIM", sim_esim: "SIM + eSIM" };
  return map[value] || value;
}

function colorLabel(colors: string[]) {
  return (colors || []).map((x) => String(x || "").trim()).filter(Boolean)[0] || "";
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.map((x) => String(x || "").trim()).filter(Boolean)));
}

function variantHref(productSlug: string, variantId: string) {
  return `/product/${encodeURIComponent(productSlug)}/${encodeURIComponent(variantId)}/`;
}

function variantSubtitle(variant: ProductDetailVariant) {
  return [storageLabel(variant.storageGb), simLabel(variant.simType), colorLabel(variant.colors)].filter(Boolean).join(" · ");
}

function fullVariantTitle(productTitle: string, variant: ProductDetailVariant) {
  const parts = [storageLabel(variant.storageGb), colorLabel(variant.colors)].filter(Boolean);
  return parts.length ? `${productTitle} ${parts.join(" ")}` : productTitle;
}

function normalizedText(...items: Array<string | undefined>) {
  return items.join(" ").toLowerCase();
}

function shouldShowSim(product: ProductDetailProduct, variants: ProductDetailVariant[]) {
  const simValues = uniqueStrings(variants.map((variant) => variant.simType));
  if (!simValues.length) return false;
  if (simValues.length > 1) return true;

  const text = normalizedText(product.title, product.categoryTitle);
  return /\biphone\b|\bipad\b|айфон|айпад|cellular|lte|сим|sim|esim/.test(text);
}

function sameStorage(a: ProductDetailVariant, b: ProductDetailVariant) {
  return storageLabel(a.storageGb) === storageLabel(b.storageGb);
}

function sameSim(a: ProductDetailVariant, b: ProductDetailVariant) {
  return simLabel(a.simType) === simLabel(b.simType);
}

function sameColor(a: ProductDetailVariant, b: ProductDetailVariant) {
  return colorLabel(a.colors) === colorLabel(b.colors);
}

function optionGroups(variants: ProductDetailVariant[], selected: ProductDetailVariant, showSim: boolean) {
  const storageCandidates = variants.filter((variant) => sameColor(variant, selected) && (!showSim || sameSim(variant, selected)));
  const simCandidates = variants.filter((variant) => sameStorage(variant, selected) && sameColor(variant, selected));
  const colorCandidates = variants.filter((variant) => sameStorage(variant, selected) && (!showSim || sameSim(variant, selected)));

  const byStorage = new Map<string, ProductDetailVariant>();
  const bySim = new Map<string, ProductDetailVariant>();
  const byColor = new Map<string, ProductDetailVariant>();

  for (const variant of storageCandidates) {
    const storage = storageLabel(variant.storageGb);
    if (storage && !byStorage.has(storage)) byStorage.set(storage, variant);
  }

  for (const variant of simCandidates) {
    const sim = simLabel(variant.simType);
    if (showSim && sim && !bySim.has(sim)) bySim.set(sim, variant);
  }

  for (const variant of colorCandidates) {
    const color = colorLabel(variant.colors);
    if (color && !byColor.has(color)) byColor.set(color, variant);
  }

  // If a strict combination has only the selected option, keep the constructor clean.
  // Example: selected black has only 256GB in DB, so 512GB is not shown at all.
  for (const variant of variants) {
    if (byStorage.size || bySim.size || byColor.size) continue;
    const storage = storageLabel(variant.storageGb);
    const sim = simLabel(variant.simType);
    const color = colorLabel(variant.colors);
    if (storage && !byStorage.has(storage)) byStorage.set(storage, variant);
    if (showSim && sim && !bySim.has(sim)) bySim.set(sim, variant);
    if (color && !byColor.has(color)) byColor.set(color, variant);
  }

  return {
    storage: Array.from(byStorage.entries()),
    sim: Array.from(bySim.entries()),
    color: Array.from(byColor.entries()),
  };
}

export function ProductDetail941(props: {
  product: ProductDetailProduct;
  variants: ProductDetailVariant[];
  selectedVariantId?: string;
}) {
  const variants = (props.variants || []).slice().sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  const selected = variants.find((v) => v.id === props.selectedVariantId) || variants[0] || null;
  if (!selected) return <div className="pdp-empty">Нет вариантов.</div>;

  const title = props.selectedVariantId ? fullVariantTitle(props.product.title, selected) : props.product.title;
  const subtitle = variantSubtitle(selected) || props.product.subtitle;
  const price = Number(selected.price || 0);
  const images = uniqueStrings([selected.imageUrl, ...(props.product.imageUrls || []), ...variants.map((v) => v.imageUrl)]);
  const mainImage = images[0] || null;
  const showSim = shouldShowSim(props.product, variants);
  const groups = optionGroups(variants, selected, showSim);

  return (
    <>
      <section className="pdp-941-shell">
        <div className="pdp-941-gallery">
          <div className="pdp-941-main-image">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt={title} />
            ) : (
              <div className="pdp-gallery-empty">Фото товара</div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="pdp-941-thumbs" aria-label="Фото товара">
              {images.slice(0, 8).map((src, index) => (
                <div className="pdp-941-thumb" key={`${src}-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="pdp-941-info">
          <div className="pdp-941-top-badges">
            <span>Рассрочка</span>
            <span>Подарки</span>
          </div>
          <div className="pdp-941-brand">{props.product.categoryTitle || "iStore116"}</div>
          <h1 className="pdp-941-title">{title}</h1>
          {subtitle ? <div className="pdp-941-subtitle">{subtitle}</div> : null}

          <div className="pdp-941-price-card">
            <div className="pdp-941-price-single">{price ? `${price.toLocaleString("ru-RU")} ₽` : "Уточнить цену"}</div>
          </div>

          <div className="pdp-941-options">
            {groups.storage.length ? <OptionGroup title="Объем памяти" productSlug={props.product.slug} selectedId={selected.id} items={groups.storage} /> : null}
            {groups.sim.length ? <OptionGroup title="Тип SIM-карты" productSlug={props.product.slug} selectedId={selected.id} items={groups.sim} /> : null}
            {groups.color.length ? <OptionGroup title="Цвет" productSlug={props.product.slug} selectedId={selected.id} items={groups.color} /> : null}
          </div>

          <div className="pdp-941-actions">
            <AddToCartButton
              variantId={selected.id}
              productId={props.product.id}
              title={title}
              subtitle={subtitle}
              imageUrl={mainImage}
              price={price}
            />
          </div>

          <div className="pdp-941-service-grid">
            <a href="/installment/" className="pdp-941-service">
              <b>В рассрочку</b>
              <span>{price ? `от ${Math.ceil(price / 24).toLocaleString("ru-RU")} ₽ в месяц` : "Уточним условия"}</span>
            </a>
            <a href="/trade-in/" className="pdp-941-service">
              <b>Trade-in</b>
              <span>Выгода до 60%</span>
            </a>
          </div>
        </aside>
      </section>

      {props.product.characteristicsText ? (
        <section id="characteristics" className="pdp-941-text-section">
          <h2>Характеристики</h2>
          <div className="pdp-characteristics-text">{props.product.characteristicsText}</div>
        </section>
      ) : null}
    </>
  );
}

function OptionGroup(props: {
  title: string;
  productSlug: string;
  selectedId: string;
  items: Array<[string, ProductDetailVariant]>;
}) {
  return (
    <div className="pdp-941-option-group">
      <div className="pdp-941-option-title">{props.title}</div>
      <div className="pdp-941-option-list">
        {props.items.map(([label, variant]) => (
          <a
            key={`${props.title}-${label}-${variant.id}`}
            className={`pdp-941-option${variant.id === props.selectedId ? " is-active" : ""}`}
            href={variantHref(props.productSlug, variant.id)}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
