-- Optional per-review rows for competitor rating trends (dashboard snapshot).
create table if not exists public.competitor_reviews (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  rating numeric,
  review_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists competitor_reviews_competitor_id_idx
  on public.competitor_reviews (competitor_id);

alter table public.competitor_reviews enable row level security;

create policy "Users read competitor reviews for own hotels"
  on public.competitor_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.competitors c
      join public.hotels h on h.id = c.hotel_id
      where c.id = competitor_reviews.competitor_id
        and h.user_id = (select auth.uid())
    )
  );

grant select on table public.competitor_reviews to authenticated;
