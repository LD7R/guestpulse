-- Run in Supabase:
-- alter table public.competitors
--   add column if not exists recent_snippets text;

alter table public.competitors
  add column if not exists recent_snippets text;
