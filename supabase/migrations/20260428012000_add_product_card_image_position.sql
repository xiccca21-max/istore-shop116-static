alter table public.products
  add column if not exists card_image_scale numeric not null default 1.42,
  add column if not exists card_image_position_x integer not null default 50,
  add column if not exists card_image_position_y integer not null default 50;

notify pgrst, 'reload schema';
