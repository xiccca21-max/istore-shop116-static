-- Add per-variant image for catalog/pdp cards.
alter table public.product_variants
  add column if not exists image_url text;

