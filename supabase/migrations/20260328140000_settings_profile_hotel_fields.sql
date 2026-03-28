-- Manager profile fields
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists display_name text,
  add column if not exists avatar_initials text,
  add column if not exists subscription_status text;

-- Hotel location and extra fields
alter table public.hotels
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists postal_code text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists response_signature text default 'The Management Team',
  add column if not exists room_count integer;

grant all on table public.profiles to authenticated;
grant all on table public.hotels to authenticated;
