-- Competitors tracked for benchmarking (per hotel)
create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  name text not null,
  google_url text,
  tripadvisor_url text,
  booking_url text,
  avg_rating numeric,
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitors_hotel_id_idx on public.competitors (hotel_id);

alter table public.competitors enable row level security;

create policy "Users manage competitors for own hotels"
  on public.competitors
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.hotels h
      where h.id = competitors.hotel_id
        and h.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.hotels h
      where h.id = competitors.hotel_id
        and h.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.competitors to authenticated;
