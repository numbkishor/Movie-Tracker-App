# Reelist — build phases

Each phase should be genuinely usable on its own before moving to the next.
Don't start phase N+1 work early because "it's related" — that's how solo
projects stall out half-finished. See architecture.md for schema details
and design.md for the visual system referenced below.

## Phase 0 — setup (few days)

- Next.js project scaffolded, deployed to Vercel (even empty, deploy early)
- Supabase project created, Auth enabled (email sign-in)
- TMDB API key obtained, `/api/tmdb/*` proxy route working end-to-end
- `.cursorrules`, this file, architecture.md, and design.md committed to the
  repo so they stay authoritative as the project grows
- Tailwind configured with the design.md palette and type scale as theme
  tokens, both light and dark variants wired up

Exit condition: a logged-in user hitting the deployed URL sees an empty
"your list" page, on both phone and desktop, same account.

## Phase 1 — MVP (the actual test of the idea)

Scope, deliberately minimal:

- Email sign-in / sign-up (Supabase Auth)
- Search-as-you-type against TMDB (debounced), movie results only —
  defer TV until Phase 3
- Add-movie screen: cover image, logo (TMDB or empty placeholder), title,
  release date, watched-on date, your rating, your review, IMDb rating
  slot showing "Coming soon"
- Cast list (name, photo, role — no external link)
- Your watched list, private by default, synced across devices
- User profile button (basic — avatar, username, sign out)
- Dark/light mode toggle
- Bento-grid home feed showing your own watched entries (no friends yet —
  it's just your data, laid out per design.md)

Explicitly NOT in this phase: friends, public/private toggle exposed in UI
(store the column, default false, but don't build the sharing flow yet),
recommendations, watchlist (separate from watched), TV/season tracking.

Exit condition: you and a few friends use this for real, on your own
accounts, for at least a couple of weeks, without you personally fixing
data by hand. That's the actual test of whether the idea holds up.

## Phase 2 — social layer

Only start this once Phase 1 has real usage data behind it.

- Friendships: request/accept/block, `friendships` table + RLS
- Public/private toggle surfaced in the UI for watched entries and
  watchlist entries
- Friend activity view (the "friends" bento card from the blueprint,
  wired to real data instead of placeholder rows)
- Basic profile visibility rules: what a friend sees vs. what a stranger
  (not yet a friend) sees, tested explicitly as two separate logged-in
  sessions before shipping

Exit condition: adding a friend and marking something public actually
shows up correctly on their side, and does not show up for a non-friend.

## Phase 3 — depth features

- Watchlist as a distinct list from watched (with its own public/private
  state)
- TV/series support, including the movie-or-series indicator and season
  handling from the original wireframe — treat this as its own
  mini-project, not a bolt-on, per the complexity flagged in
  architecture.md
- Recommendations based on the most recently added title (TMDB's
  "similar" endpoint) — surfaced honestly as "similar titles," not
  marketed as smart/personalized
- Search UI handling for duplicate TMDB entries (reissues, re-releases) —
  show release year prominently so users pick the right one

## Phase 4 — stretch (only if Phase 1–3 prove the app has legs)

- Native app-store presence via Capacitor wrapping the existing PWA —
  revisit the "should this be a native app" question with real usage
  numbers in hand, not speculation
- Real IMDb rating integration, if it's still wanted at this point —
  this was deliberately deferred, not abandoned
- Supabase paid tier planning, if usage approaches free-tier limits
- Whatever gap analysis comes out of actually watching people use
  Phases 1–3 — this phase should be written last, based on evidence, not
  planned now
