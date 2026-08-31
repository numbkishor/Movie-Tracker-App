-- Reelist — initial schema (Phase 1 / MVP)
--
-- Mirrors docs/architecture.md exactly: snake_case, same column names, same
-- types. Every table holding user data has RLS enabled in this same migration —
-- per docs/security.md, no table ever goes live with RLS off "temporarily".
--
-- Run against a fresh Supabase project:
--   supabase db push          (CLI)
-- or paste into the SQL editor in the Supabase dashboard.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),

  -- Usernames are used for friend lookup in Phase 2, so constrain the shape now
  -- rather than migrating a table full of unusable values later.
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 48)
);

alter table public.profiles enable row level security;

-- architecture.md says profiles are "readable by anyone (needed for
-- search/friend-lookup)". Narrowed to authenticated readers only: friend lookup
-- is a Phase 2 feature and no signed-out visitor needs to enumerate usernames.
-- Widen this deliberately if public profile pages are ever scoped.
create policy "profiles are readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "a user inserts only their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

-- USING selects which rows may be updated; WITH CHECK validates the result.
-- Both are required — a policy with only USING lets a user rewrite their row's
-- id and hand it to someone else.
create policy "a user updates only their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "a user deletes only their own profile"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- movies — local cache of TMDB metadata
-- ---------------------------------------------------------------------------

create table if not exists public.movies (
  tmdb_id       integer primary key,
  media_type    text not null default 'movie',
  title         text not null,
  release_date  date,
  poster_path   text,
  backdrop_path text,
  logo_path     text,
  cached_at     timestamptz not null default now(),

  constraint movies_tmdb_id_positive check (tmdb_id > 0),
  constraint movies_media_type check (media_type in ('movie', 'tv')),
  constraint movies_title_length check (char_length(title) between 1 and 300),
  -- TMDB image paths only, never an arbitrary URL: these are interpolated into
  -- an image.tmdb.org URL, so a full URL here would be an open redirect for
  -- image loads.
  constraint movies_poster_path_shape check (poster_path is null or poster_path ~ '^/[A-Za-z0-9._-]+$'),
  constraint movies_backdrop_path_shape check (backdrop_path is null or backdrop_path ~ '^/[A-Za-z0-9._-]+$'),
  constraint movies_logo_path_shape check (logo_path is null or logo_path ~ '^/[A-Za-z0-9._-]+$')
);

alter table public.movies enable row level security;

-- Cached public metadata, not user data — readable by anyone.
create policy "cached movie metadata is readable by anyone"
  on public.movies for select
  using (true);

-- architecture.md wants writes here to come only from the server-side TMDB
-- route. With no service-role key in play (docs/security.md), the server acts
-- as the signed-in user, so Postgres cannot distinguish "our server action"
-- from "a hand-rolled client call" — both carry the same JWT. What this policy
-- does guarantee: only a signed-in account can write, the CHECK constraints
-- above bound the shape, and every add re-upserts straight from TMDB, so a
-- bogus row is corrected the next time anyone adds that title. Residual risk is
-- a friend-group member writing a junk cache row; accepted for MVP scale.
-- No delete policy: nothing should ever remove a cache row a list points at.
create policy "signed-in users may cache a movie"
  on public.movies for insert
  to authenticated
  with check (true);

create policy "signed-in users may refresh a cached movie"
  on public.movies for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- watched_entries
-- ---------------------------------------------------------------------------

create table if not exists public.watched_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  movie_id   integer not null references public.movies (tmdb_id) on delete restrict,
  rating     numeric(2,1),
  review     text,
  watched_on date not null default current_date,
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),

  -- Validated in Postgres as well as in the server action, because a
  -- client-side-only check is trivially bypassed (docs/security.md).
  constraint watched_entries_rating_range check (rating is null or (rating >= 0.5 and rating <= 5)),
  constraint watched_entries_rating_half_steps check (rating is null or (rating * 2) = floor(rating * 2)),
  constraint watched_entries_review_length check (review is null or char_length(review) <= 4000),
  constraint watched_entries_watched_on_not_future check (watched_on <= current_date),
  constraint watched_entries_watched_on_plausible check (watched_on >= date '1888-01-01'),

  -- One entry per title per user. Rewatch logging is a separate product
  -- decision, not something to grow into accidentally.
  constraint watched_entries_one_per_movie unique (user_id, movie_id)
);

create index if not exists watched_entries_user_watched_on_idx
  on public.watched_entries (user_id, watched_on desc, created_at desc);

alter table public.watched_entries enable row level security;

-- Phase 1 has no viewer besides the owner. is_public is stored and defaults to
-- false, but there is deliberately NO public-read policy here: that policy
-- belongs with the Phase 2 friendships table that is supposed to gate it
-- (docs/security.md). Adding it early would expose rows with nothing checking
-- who the viewer is.
create policy "a user reads only their own watched entries"
  on public.watched_entries for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "a user inserts only their own watched entries"
  on public.watched_entries for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "a user updates only their own watched entries"
  on public.watched_entries for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "a user deletes only their own watched entries"
  on public.watched_entries for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- watchlist_entries
--
-- The table is in architecture.md's MVP schema, so it is created and secured
-- here. The watchlist FEATURE is Phase 3 — nothing in the app reads or writes
-- this table yet, and it must not be built early (docs/phases.md).
-- ---------------------------------------------------------------------------

create table if not exists public.watchlist_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  movie_id   integer not null references public.movies (tmdb_id) on delete restrict,
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),

  constraint watchlist_entries_one_per_movie unique (user_id, movie_id)
);

create index if not exists watchlist_entries_user_created_at_idx
  on public.watchlist_entries (user_id, created_at desc);

alter table public.watchlist_entries enable row level security;

create policy "a user reads only their own watchlist entries"
  on public.watchlist_entries for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "a user inserts only their own watchlist entries"
  on public.watchlist_entries for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "a user updates only their own watchlist entries"
  on public.watchlist_entries for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "a user deletes only their own watchlist entries"
  on public.watchlist_entries for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Profile bootstrap
--
-- Every auth.users row needs a matching profiles row, because watched_entries
-- foreign-keys to profiles. Doing this in a trigger means it cannot be skipped
-- by a sign-up path that forgets to call it.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Pinned search_path: a SECURITY DEFINER function without this can be hijacked
-- by a caller-controlled search_path.
set search_path = public, pg_temp
as $$
declare
  base_username text;
  candidate     text;
  suffix        integer := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));

  if char_length(base_username) < 3 then
    base_username := 'user' || base_username;
  end if;

  base_username := left(base_username, 20);
  candidate := base_username;

  -- Usernames are unique; walk to the first free one rather than failing sign-up.
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base_username, 20) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
