alter table public.products
  add column if not exists card_colors jsonb not null default '[]'::jsonb,
  add column if not exists characteristics_text text not null default '';
