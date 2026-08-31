# Reelist — architecture

## What this is

A social movie watched-list tracker. A user logs in once and gets the same
data whether they're on their phone or their PC — add a movie on one, see it
on the other. Public/private lists, friends, and recommendations layer on
top of that core.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript | One codebase for desktop and mobile via responsive web + PWA, no separate native build |
| Backend | Supabase (Postgres, Auth, RLS) | Free tier covers MVP scale; Postgres experience transfers directly from coursework |
| Movie data | TMDB API | Free for non-commercial use; posters, backdrops, logos, cast, search all in one place |
| Hosting | Vercel | Free tier, zero-config Next.js deploys |
| Mobile | PWA (installable, add-to-home-screen) | Defers native app-store builds until there's a reason to invest in them |

Deliberately not using: Flutter, React Native, Electron. See phases.md for
when (if ever) a native wrapper via Capacitor gets revisited.

## High-level flow

```
[ Browser: phone or PC ]
        |
        v
[ Next.js app (Vercel) ]
   |            |
   |            v
   |     [ /api/tmdb/* routes ]  -->  [ TMDB API ]
   |     (holds the TMDB key server-side)
   v
[ Supabase: Postgres + Auth ]
   - auth.users (managed by Supabase)
   - profiles
   - movies (local cache of TMDB data)
   - watched_entries
   - watchlist_entries
   - friendships
```

A user's session is issued by Supabase Auth and works identically whether
they signed in on mobile or desktop — this is what makes "add on phone, see
on PC" work with no custom sync logic. It's just the same database.

## Why movies get cached locally

TMDB is the source of truth for metadata, but every `watched_entries` row
needs to point at *something* stable. Rather than re-fetching TMDB on every
list render, the app upserts a lightweight row into a local `movies` table
the first time any user adds that title, and everything else foreign-keys
to it. This also means a title's poster/backdrop path doesn't vanish if
TMDB briefly errors.

## Schema

> **Amended in Phase 3.** `movies.tmdb_id` was the primary key on its own while
> the app was films-only. TMDB numbers films and series in separate sequences,
> so once series were added, film 1399 and series 1399 collided on that key. The
> identity of a cached title is now **(tmdb_id, media_type)**, and every table
> referencing it carries both columns. The MVP shape is kept below for history;
> `supabase/migrations/0003_depth.sql` is the change, and the current shape is
> summarised after it.

```
profiles
  id            uuid, references auth.users.id, primary key
  username      text, unique
  display_name  text
  avatar_url    text, nullable
  created_at    timestamptz, default now()

movies
  tmdb_id       integer, primary key
  media_type    text ('movie' | 'tv')
  title         text
  release_date  date, nullable
  poster_path   text, nullable
  backdrop_path text, nullable
  logo_path     text, nullable        -- null if TMDB has no logo; UI shows placeholder
  cached_at     timestamptz, default now()

watched_entries
  id            uuid, primary key, default gen_random_uuid()
  user_id       uuid, references profiles.id
  movie_id      integer, references movies.tmdb_id
  rating        numeric(2,1), nullable       -- e.g. 4.5
  review        text, nullable
  watched_on    date
  is_public     boolean, default false
  created_at    timestamptz, default now()

watchlist_entries
  id            uuid, primary key, default gen_random_uuid()
  user_id       uuid, references profiles.id
  movie_id      integer, references movies.tmdb_id
  is_public     boolean, default false
  created_at    timestamptz, default now()
```

### Current shape (after Phases 2–3)

```
movies
  primary key            (tmdb_id, media_type)   -- was tmdb_id alone

watched_entries
  media_type    text ('movie' | 'tv')
  foreign key   (movie_id, media_type) -> movies (tmdb_id, media_type)
  unique        (user_id, movie_id, media_type)

watchlist_entries
  same two changes as watched_entries

friendships
  id            uuid, primary key
  requester_id  uuid, references profiles.id
  addressee_id  uuid, references profiles.id
  status        text ('pending' | 'accepted' | 'blocked')
  blocked_by    uuid, nullable, references profiles.id
  created_at    timestamptz
  updated_at    timestamptz
  unique index on (least(requester,addressee), greatest(requester,addressee))
                -- one row per pair, whichever direction it was requested in

watched_seasons
  id            uuid, primary key
  entry_id      uuid, references watched_entries.id on delete cascade
  season_number integer
  watched_on    date
                -- hangs off the series entry rather than carrying its own
                -- user_id, so ownership and visibility have exactly one source

title_seasons
  (show_id, season_number) primary key   -- cached TMDB season metadata
```

Still not modelled, deliberately: episode-level progress. A season is the unit
people talk about finishing.

## Row-Level Security — the part most likely to bite you

The assumption is confirmed and implemented as stated: **"public" means visible
to your accepted friends, never the open internet.** There is no policy anywhere
that exposes a row to an anonymous visitor, and `supabase/tests/rls.sql` asserts
that a signed-out reader sees nothing on any table.

- `watched_entries` / `watchlist_entries`: a row is readable if
  `user_id = auth.uid()` (it's yours) OR (`is_public = true` AND the viewer
  has an accepted friendship with `user_id`).
- All writes (insert/update/delete) require `user_id = auth.uid()` — you can
  never write to someone else's list.
- `profiles`: readable by anyone (needed for search/friend-lookup), writable
  only by the owner.
- `movies`: readable by anyone (it's just cached metadata, not user data);
  writable only via the server-side TMDB route, not directly by clients.

Two helper functions do the friend check (`is_accepted_friend`,
`has_block_with`). They are SECURITY DEFINER with a pinned `search_path`,
because a policy that queried `friendships` directly would evaluate that
subquery under the *viewer's* own RLS — fragile and recursive. Each takes only
"the other person" and reads `auth.uid()` itself, so neither can be used to
probe whether two strangers are friends.

Test every policy by trying to read/write as a *different* logged-in user in
a second session before considering a table "done." `supabase/tests/rls.sql` is
the fast repeat of that check and covers stranger, pending-request, accepted
friend, and blocked cases.

## TMDB integration points

- All calls go through `/app/api/tmdb/*` — the key never reaches the
  browser.
- Search-as-you-type: debounce ~300ms client-side before hitting the route.
- On "add movie," fetch details + images + credits in one request sequence,
  upsert into `movies`, then insert the `watched_entries` row.
- Logo: use the `images` endpoint's `logos` array, prefer an `en` entry, fall
  back to the poster or a placeholder if none exists. No user upload path.
- IMDb rating: not fetched from anywhere. UI renders a static "Coming soon"
  label in that slot.
- Cast: name, character, profile photo only. No outbound IMDb link.

## Sync behavior in practice

There is no explicit "sync" mechanism to build — it's a natural consequence
of both devices reading/writing the same Supabase tables through the same
authenticated user. The only thing to get right is not caching stale data
client-side longer than makes sense (e.g., revalidate the watched-list query
on navigation, don't rely on a stale client cache surviving across devices).

## Known tricky spots (see phases.md for when these get tackled)

- Duplicate TMDB entries for reissues/re-releases — search UI needs to
  surface release year clearly so users pick the right one.
- Movies vs. TV/season tracking — schema above is movies-first; a `tv`
  media_type row exists but season-level watched state is intentionally not
  modeled yet.
- Recommendations — TMDB's "similar movies" endpoint is the v1 approach;
  it's a lookup, not a real recommendation engine, and should be described
  to users that way.
