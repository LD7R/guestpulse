-- Map pins and sync metadata for benchmarking
alter table public.hotels
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.competitors
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists last_synced_at timestamptz,
  add column if not exists address text;
