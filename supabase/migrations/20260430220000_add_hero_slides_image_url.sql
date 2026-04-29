-- Хостинг мог быть создан без колонки image_url (есть только link_url из более поздней миграции).
alter table public.hero_slides
  add column if not exists image_url text;

notify pgrst, 'reload schema';
