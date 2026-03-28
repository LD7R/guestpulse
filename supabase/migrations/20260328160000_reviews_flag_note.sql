alter table public.reviews
  add column if not exists flagged boolean default false,
  add column if not exists internal_note text,
  add column if not exists flag_color text default 'red';

grant all on table public.reviews to authenticated;
grant all on table public.reviews to service_role;
