# Reelist

A social movie watched-list tracker. Sign in once and your list is the same on
your phone and your PC — because both are reading the same rows.

This repository implements **Phases 0–3** of `docs/phases.md` in full, plus the
Capacitor scaffold from Phase 4.

Phase 4's IMDb rating item is deliberately still unbuilt — see the explicit
decisions list in `docs/prd.md` for why. The phase gate in `docs/phases.md` was
lifted by the project owner rather than met, so the exit conditions in each
phase remain open questions about real usage, not boxes that were ticked.

| Phase | What it added | State |
|---|---|---|
| 0 | Scaffold, design tokens, schema, TMDB proxy | Done |
| 1 | Auth, search, watched list, bento feed, PWA | Done |
| 2 | Friends, per-entry sharing, friend activity | Done |
| 3 | Watchlist, series + seasons, similar titles | Done |
| 4 | Capacitor wrapper | Scaffolded, see `docs/native.md` |
| 4 | Real IMDb rating | Not built — see `docs/prd.md` |

## The docs are the spec

| File | What it decides |
|---|---|
| `docs/prd.md` | What the product is, and the decisions not to relitigate |
| `docs/architecture.md` | Stack, schema, RLS model, TMDB integration points |
| `docs/design.md` | Palette, type scale, bento grid, liquid glass |
| `docs/phases.md` | What belongs in which phase |
| `docs/security.md` | Secrets, auth, RLS, input handling |
| `docs/review.md` | The pre-merge checklist |
| `.cursorrules` | Day-to-day code rules |

Read `docs/architecture.md` and `docs/design.md` before writing non-trivial code.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth + RLS) · TMDB · deployed on Vercel · installable as a PWA.

## Getting it running

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

Create a free project, then apply the migrations **in order**:

```bash
supabase db push
```

Or paste them into the SQL editor one at a time:

| Migration | What it does |
|---|---|
| `0001_init.sql` | `profiles`, `movies`, `watched_entries`, `watchlist_entries`, RLS on all four, and the trigger that gives every new account a profile row |
| `0002_social.sql` | `friendships`, the friend-check helpers, and the rewritten entry-visibility policies |
| `0003_depth.sql` | Re-keys titles to `(tmdb_id, media_type)` for series support, adds `watched_seasons` and `title_seasons` |

`0003` alters tables `0001` created, so running them out of order will fail.

Under **Authentication → Providers**, enable email sign-in. If you leave email
confirmation on, set the confirmation redirect to `<your-url>/auth/confirm`.

Copy the project URL and the **anon** key into `.env.local`. The service-role key
is not used anywhere in this app and should not be added.

### 3. TMDB

Request a free v3 API key at themoviedb.org (non-commercial use) and set
`TMDB_API_KEY` in `.env.local`. It is server-side only — no `NEXT_PUBLIC_`
prefix — and every call goes through `/api/tmdb/*`.

### 4. Run

```bash
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint
npm run build
```

## Verifying RLS

`docs/security.md` treats RLS as the highest-risk area in the app, so there is a
script for it:

```sql
-- Supabase SQL editor, after applying the migration
\i supabase/tests/rls.sql
```

It creates three throwaway users and asserts, in one transaction that rolls
back:

- an owner sees their own rows and nobody else's;
- a **stranger** sees nothing — including entries marked shared;
- a **pending** request grants no visibility, and a requester cannot accept
  their own request;
- an **accepted friend** sees exactly the shared rows, cannot see private ones,
  and cannot update or delete what they can see;
- season progress inherits its parent entry's visibility;
- a **blocked** user loses visibility and cannot delete or undo the block;
- a signed-out reader sees nothing on any table.

A raised exception means a policy is wrong. Still do the two-real-sessions check
by hand before calling a policy done — the script is the fast repeat, not a
replacement for it.

## Deploying to Vercel

Import the repo, set the same three environment variables in the project
settings, and deploy. No build configuration is needed.

## Layout

```
docs/                     the spec files above, plus native.md
supabase/migrations/      schema + RLS, applied in order
supabase/tests/           RLS assertions
src/app/(auth)/           sign-in, sign-up
src/app/(app)/            signed-in shell:
                            /                 bento feed, friend activity
                            /search           films and series
                            /title/[media]/   detail, entry form, seasons
                            /watchlist        queued titles
                            /friends          requests, friends, blocks
                            /u/[username]     someone else's profile
                            /profile          your own
src/app/api/tmdb/         TMDB proxy — the key lives here, never in the browser
src/app/api/people/       username lookup for adding friends
src/components/           UI, split by area
src/lib/tmdb.ts           the one place TMDB responses are shaped
src/lib/routes.ts         URL builders, safe to import from client components
src/lib/titles.ts         entry queries (server-only)
src/lib/friends.ts        friendship queries (server-only)
src/lib/supabase/         server + middleware clients, generated-shape DB types
```

## Native app

See `docs/native.md`. The Capacitor config is committed; the native build itself
has not been run.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDb.
