-- Raffle reports feed: admin-managed post list with text and up to 5 CDN image URLs.

create table if not exists public.raffle_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  image_urls text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_raffle_reports_sort on public.raffle_reports(sort_order, created_at);

alter table public.raffle_reports enable row level security;

do $$ begin
  create policy "public_read_raffle_reports" on public.raffle_reports for select using (true);
exception when duplicate_object then null; end $$;

