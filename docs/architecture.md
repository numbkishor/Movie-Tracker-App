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

## Schema (MVP scope)

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

Deferred to a later phase (not in MVP): `friendships` table, season/episode
tracking, any table backing recommendations.

## Row-Level Security — the part most likely to bite you

Assumption to confirm before building: "public" means visible to your
accepted friends, not the open internet. If that's wrong, the policies
below need to change — this is a product decision, not just a technical one.

- `watched_entries` / `watchlist_entries`: a row is readable if
  `user_id = auth.uid()` (it's yours) OR (`is_public = true` AND the viewer
  has an accepted friendship with `user_id`).
- All writes (insert/update/delete) require `user_id = auth.uid()` — you can
  never write to someone else's list.
- `profiles`: readable by anyone (needed for search/friend-lookup), writable
  only by the owner.
- `movies`: readable by anyone (it's just cached metadata, not user data);
  writable only via the server-side TMDB route, not directly by clients.

Test every policy by trying to read/write as a *different* logged-in user in
a second session before considering a table "done."

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
