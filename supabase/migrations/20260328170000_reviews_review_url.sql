-- Direct links to reviews on source platforms (from scrape)
alter table public.reviews
  add column if not exists review_url text;
