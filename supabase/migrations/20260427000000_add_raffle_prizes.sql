-- Raffle prizes: admin-managed list of prizes, optionally linked to a product.

create table if not exists public.raffle_prizes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  product_id uuid references public.products(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_raffle_prizes_sort on public.raffle_prizes(sort_order);

alter table public.raffle_prizes enable row level security;

do $$ begin
  create policy "public_read_raffle_prizes" on public.raffle_prizes for select using (true);
exception when duplicate_object then null; end $$;

