# Reelist — security

This is a solo-dev project, but "solo" isn't a reason to skip security
basics — it's the reason no one else will catch a mistake before it ships.
Treat this file as a checklist to revisit at the end of every phase in
phases.md, not a one-time read.

## Secrets and keys

- TMDB API key lives in a server-side environment variable only
  (`TMDB_API_KEY`, not `NEXT_PUBLIC_TMDB_API_KEY`). It is never sent to the
  browser. All TMDB calls go through `/app/api/tmdb/*`.
- Supabase has two keys: the anon/public key (safe for the client — it's
  designed to be public and relies on RLS to restrict access) and the
  service-role key (full admin access, bypasses RLS entirely). The
  service-role key never goes in client code, never gets committed, and is
  only used in trusted server contexts if a specific admin task genuinely
  needs it.
- `.env.local` is gitignored. Commit `.env.example` with variable names
  only, no real values.
- If a key is ever accidentally committed: rotate it immediately in the
  TMDB/Supabase dashboard — assume a leaked key is compromised the moment
  it's pushed, even to a private repo.

## Authentication

- Supabase Auth handles sign-in; don't hand-roll password storage or
  session handling.
- Session tokens are managed by the Supabase client library — don't store
  auth tokens in localStorage manually or pass them around outside what the
  library already does.
- No "remember me forever" trust decisions beyond what Supabase's default
  session length provides, unless explicitly reconsidered later.

## Row-Level Security — the highest-risk area in this app

This is where a mistake actually leaks another person's private data, so it
gets its own section instead of a bullet point.

- Every table holding user data (`profiles`, `watched_entries`,
  `watchlist_entries`, and `friendships` once it exists) has RLS enabled
  before it goes live. Never ship a table with RLS off "temporarily to test
  something" — test with RLS on, using real policies.
- The rule from architecture.md: a row is yours to read/write if
  `user_id = auth.uid()`. It's readable by someone else only if explicitly
  marked public AND that person is an accepted friend (once friendships
  exist). Until Phase 2, "public" has no viewer besides the owner — don't
  build a public-read policy ahead of the feature that's supposed to gate it.
- Test every new policy with two separate logged-in sessions (e.g. two
  browser profiles, two real accounts) before considering it done: confirm
  the owner can read/write, and confirm a different user cannot read or
  write what they shouldn't.
- Watch for the common RLS mistake: a policy that's correct for `SELECT`
  but forgotten for `UPDATE`/`DELETE`, or a policy using `USING` but missing
  `WITH CHECK` on writes.

## Input handling

- Never build raw SQL strings from user input — Supabase's client library
  parameterizes queries by default; keep it that way, don't drop to raw SQL
  unless genuinely necessary, and if so, parameterize explicitly.
- Reviews and any free-text fields are rendered as text, not raw HTML — no
  `dangerouslySetInnerHTML` on user-submitted content.
- Validate rating values and dates server-side (API route or a Postgres
  check constraint), not just in the UI — a client-side-only check is
  trivially bypassed.

## Third-party data

- TMDB attribution notice ("This product uses the TMDB API but is not
  endorsed or certified by TMDb") is displayed per their terms — this is a
  license condition, not optional polish.
- Cached TMDB data (`movies` table) is metadata only — titles, dates, image
  paths. No TMDB user data, no scraping beyond what the API provides.

## Dependencies

- Keep dependencies minimal — every package is a piece of code you didn't
  write and are trusting. Prefer what Next.js/Supabase/TMDB already give
  you over adding a new library for something small.
- Run `npm audit` (or equivalent) periodically, not just at project start.

## Data the app should never collect

- No payment information — this app has no monetization, so there should
  never be a reason to touch this.
- No more personal data than a username, display name, and optional avatar
  — no real names, phone numbers, or addresses required to use the app.

## If something goes wrong

- A leaked key: rotate it immediately (see Secrets above).
- A discovered RLS gap: disable the affected feature (or tighten the
  policy) before announcing anything publicly — fix first, then decide
  whether affected users need to be told what was exposed and for how long.
- Keep a simple running note of security-relevant decisions and incidents,
  even informally — future-you will want the history.
