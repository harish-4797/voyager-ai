-- ============================================================================
-- VoyagerAI database schema for Supabase
-- Run once in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent).
-- ============================================================================

-- ---------- Profiles: one row per user (name + travel preferences) ----------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  full_name              text not null default '',
  travel_style           text[] not null default '{}',
  dietary_restrictions   text[] not null default '{}',
  preferred_budget_range text not null default 'mid-range',
  home_airport           text not null default '',
  avoided_activities     text[] not null default '{}',
  past_trips_summary     jsonb not null default '[]'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------- Trips: each user's generated itineraries ----------
create table if not exists public.trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null default '',
  city         text not null,
  country      text,
  days         integer not null check (days between 1 and 30),
  budget       integer not null check (budget >= 0),
  month        text,
  start_date   date,
  interests    text[] not null default '{}',
  status       text not null default 'planning'
               check (status in ('planning', 'confirmed', 'completed', 'cancelled')),
  itinerary    jsonb,
  packing_list jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists trips_user_created_idx on public.trips (user_id, created_date desc);

-- ---------- Keep updated timestamps current ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.set_updated_date() returns trigger
language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trips_set_updated_date on public.trips;
create trigger trips_set_updated_date before update on public.trips
  for each row execute function public.set_updated_date();

-- ---------- Create a profile automatically when someone signs up ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security: users can only touch their own rows ----------
alter table public.profiles enable row level security;
alter table public.trips    enable row level security;

drop policy if exists "Profiles: read own"   on public.profiles;
drop policy if exists "Profiles: insert own" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: read own"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Trips: read own"   on public.trips;
drop policy if exists "Trips: insert own" on public.trips;
drop policy if exists "Trips: update own" on public.trips;
drop policy if exists "Trips: delete own" on public.trips;
create policy "Trips: read own"   on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "Trips: insert own" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Trips: update own" on public.trips for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Trips: delete own" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);
