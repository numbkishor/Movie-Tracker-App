-- Reelist — Phase 3, depth features
--
-- TV support forces a schema correction that docs/architecture.md's MVP schema
-- could not have needed while the app was movies-only:
--
--   `movies.tmdb_id` was the primary key on its own. TMDB numbers films and
--   shows in SEPARATE sequences, so movie 1399 and series 1399 are different
--   titles that would collide on that key — the first one cached would silently
--   win and every entry pointing at the other would show the wrong title.
--
-- So the identity of a cached title becomes (tmdb_id, media_type), and every
-- table referencing it carries both columns. Existing rows are all films, which
-- is why the added columns default to 'movie' and backfill cleanly.

-- ---------------------------------------------------------------------------
-- Re-key the title cache
-- ---------------------------------------------------------------------------

alter table public.watched_entries drop constraint if exists watched_entries_movie_id_fkey;
alter table public.watchlist_entries drop constraint if exists watchlist_entries_movie_id_fkey;

alter table public.movies drop constraint if exists movies_pkey;
alter table public.movies add constraint movies_pkey primary key (tmdb_id, media_type);

alter table public.watched_entries
  add column if not exists media_type text not null default 'movie';
alter table public.watchlist_entries
  add column if not exists media_type text not null default 'movie';

alter table public.watched_entries
  drop constraint if exists watched_entries_media_type_check;
alter table public.watched_entries
  add constraint watched_entries_media_type_check check (media_type in ('movie', 'tv'));

alter table public.watchlist_entries
  drop constraint if exists watchlist_entries_media_type_check;
alter table public.watchlist_entries
  add constraint watchlist_entries_media_type_check check (media_type in ('movie', 'tv'));

alter table public.watched_entries
  add constraint watched_entries_movie_id_fkey
  foreign key (movie_id, media_type) references public.movies (tmdb_id, media_type)
  on delete restrict;

alter table public.watchlist_entries
  add constraint watchlist_entries_movie_id_fkey
  foreign key (movie_id, media_type) references public.movies (tmdb_id, media_type)
  on delete restrict;

-- "One entry per title" now has to mean one per title *of that kind*.
alter table public.watched_entries drop constraint if exists watched_entries_one_per_movie;
alter table public.watched_entries
  add constraint watched_entries_one_per_title unique (user_id, movie_id, media_type);

alter table public.watchlist_entries drop constraint if exists watchlist_entries_one_per_movie;
alter table public.watchlist_entries
  add constraint watchlist_entries_one_per_title unique (user_id, movie_id, media_type);

-- ---------------------------------------------------------------------------
-- Entry-scoped visibility helpers
-- ---------------------------------------------------------------------------

create or replace function public.owns_watched_entry(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.watched_entries we
    where we.id = entry and we.user_id = auth.uid()
  );
$$;

create or replace function public.can_view_watched_entry(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.watched_entries we
    where we.id = entry
      and (
        we.user_id = auth.uid()
        or (we.is_public and public.is_accepted_friend(we.user_id))
      )
  );
$$;

revoke all on function public.owns_watched_entry(uuid) from public;
revoke all on function public.can_view_watched_entry(uuid) from public;
grant execute on function public.owns_watched_entry(uuid) to authenticated;
grant execute on function public.can_view_watched_entry(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- watched_seasons
--
-- Season progress hangs off the series' watched_entries row rather than
-- carrying its own user_id and title reference. That way there is one place
-- that decides who owns and who may see a series entry, and season rows cannot
-- drift out of agreement with it — including its is_public flag.
--
-- Episode-level tracking is deliberately still not modelled. A season is the
-- unit people actually talk about finishing.
-- ---------------------------------------------------------------------------

create table if not exists public.watched_seasons (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null references public.watched_entries (id) on delete cascade,
  season_number integer not null,
  watched_on    date not null default current_date,
  created_at    timestamptz not null default now(),

  -- TMDB numbers specials as season 0, so zero is valid.
  constraint watched_seasons_number_range check (season_number between 0 and 200),
  constraint watched_seasons_watched_on_not_future check (watched_on <= current_date),
  constraint watched_seasons_one_per_season unique (entry_id, season_number)
);

create index if not exists watched_seasons_entry_idx
  on public.watched_seasons (entry_id, season_number);

alter table public.watched_seasons enable row level security;

create policy "a user reads seasons of entries they may view"
  on public.watched_seasons for select
  to authenticated
  using (public.can_view_watched_entry(entry_id));

create policy "a user inserts seasons on their own entries"
  on public.watched_seasons for insert
  to authenticated
  with check (public.owns_watched_entry(entry_id));

create policy "a user updates seasons on their own entries"
  on public.watched_seasons for update
  to authenticated
  using (public.owns_watched_entry(entry_id))
  with check (public.owns_watched_entry(entry_id));

create policy "a user deletes seasons on their own entries"
  on public.watched_seasons for delete
  to authenticated
  using (public.owns_watched_entry(entry_id));

-- ---------------------------------------------------------------------------
-- Cached season metadata, so a shared list can render season names without
-- every viewer hitting TMDB. Same trust model as `movies`.
-- ---------------------------------------------------------------------------

create table if not exists public.title_seasons (
  show_id       integer not null,
  season_number integer not null,
  name          text not null,
  episode_count integer,
  air_date      date,
  poster_path   text,
  -- Pinned to 'tv' so the composite foreign key below has a second column to
  -- match on. Only shows have seasons.
  media_type    text not null default 'tv',
  cached_at     timestamptz not null default now(),

  primary key (show_id, season_number),
  constraint title_seasons_media_type check (media_type = 'tv'),
  constraint title_seasons_show_fkey
    foreign key (show_id, media_type) references public.movies (tmdb_id, media_type),
  constraint title_seasons_number_range check (season_number between 0 and 200),
  constraint title_seasons_poster_shape
    check (poster_path is null or poster_path ~ '^/[A-Za-z0-9._-]+$')
);

alter table public.title_seasons enable row level security;

create policy "cached season metadata is readable by anyone"
  on public.title_seasons for select
  using (true);

create policy "signed-in users may cache seasons"
  on public.title_seasons for insert
  to authenticated
  with check (true);

create policy "signed-in users may refresh cached seasons"
  on public.title_seasons for update
  to authenticated
  using (true)
  with check (true);
