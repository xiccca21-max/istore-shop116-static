-- Core tables for iStore Shop 116 (public schema)

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  image_url text,
  sort_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  category_id uuid not null references public.categories(id) on delete restrict,
  base_price integer not null default 0,
  image_urls jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.sim_type as enum ('esim','sim_esim','sim');
exception when duplicate_object then null; end $$;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_gb integer not null,
  sim_type public.sim_type not null,
  colors jsonb not null default '[]'::jsonb,
  price integer not null,
  sku text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists hero_slides_title_unique on public.hero_slides(title);

create table if not exists public.homepage_featured_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists homepage_featured_products_product_unique on public.homepage_featured_products(product_id);
create index if not exists idx_homepage_featured_products_sort on public.homepage_featured_products(sort_order);

do $$ begin
  create type public.order_status as enum ('new','handled');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  comment text not null default '',
  total integer not null default 0,
  status public.order_status not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  qty integer not null,
  price integer not null
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- RLS
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.hero_slides enable row level security;
alter table public.homepage_featured_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public read for storefront (anon)
do $$ begin
  create policy "public_read_categories" on public.categories for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_read_products" on public.products for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_read_variants" on public.product_variants for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_read_hero" on public.hero_slides for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_read_homepage_featured" on public.homepage_featured_products for select using (true);
exception when duplicate_object then null; end $$;

-- Public insert for orders (MVP lead form)
do $$ begin
  create policy "public_insert_orders" on public.orders for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public_insert_order_items" on public.order_items for insert with check (true);
exception when duplicate_object then null; end $$;

