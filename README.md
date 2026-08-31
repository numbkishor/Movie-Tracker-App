# Reelist

A social movie watched-list tracker. Sign in once and your list is the same on
your phone and your PC — because both are reading the same rows.

This repository implements **Phase 0 and Phase 1** of `docs/phases.md`. Friends,
sharing, watchlist, TV tracking and recommendations are Phases 2–4 and are
deliberately not built yet.

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

Create a free project, then apply the schema:

```bash
supabase db push
```

Or paste `supabase/migrations/0001_init.sql` into the SQL editor. It creates
`profiles`, `movies`, `watched_entries` and `watchlist_entries`, enables RLS on
all four, and installs the trigger that gives every new account a profile row.

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

It creates two throwaway users, asserts that neither can read, update or delete
the other's rows (and that a signed-out visitor can read nothing at all), then
rolls back. A raised exception means a policy is wrong.

Still do the two-real-sessions check by hand before calling a policy done — the
script is the fast repeat, not a replacement for it.

## Deploying to Vercel

Import the repo, set the same three environment variables in the project
settings, and deploy. No build configuration is needed.

## Layout

```
docs/                     the spec files above
supabase/migrations/      schema + RLS
supabase/tests/           RLS assertions
src/app/(auth)/           sign-in, sign-up
src/app/(app)/            signed-in shell: feed, search, film detail, profile
src/app/api/tmdb/         TMDB proxy — the key lives here, never in the browser
src/components/           UI, split by area
src/lib/tmdb.ts           the one place TMDB responses are shaped
src/lib/supabase/         server + middleware clients, generated-shape DB types
```

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDb.
