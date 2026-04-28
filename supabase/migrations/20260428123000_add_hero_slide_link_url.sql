alter table public.hero_slides
  add column if not exists link_url text;

notify pgrst, 'reload schema';
