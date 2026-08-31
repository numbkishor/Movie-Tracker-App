# Reelist — PRD

## Problem

There's no shortage of movie-tracking apps — Letterboxd, Trakt, and Simkl
already cover watched-lists, ratings, reviews, and social features well.
This project isn't trying to out-compete them. The goal is a real,
self-built, full-stack app that a small group of friends actually uses,
where every feature exists because it was decided on deliberately — not
copied wholesale from an existing tool.

## Goal

Ship something people (starting with you and your friends) genuinely keep
using across phone and desktop under one account, built solo, for $0.

## Non-goals

- Competing with Letterboxd/Trakt/Simkl on breadth or scale
- Monetization of any kind (ads, subscriptions, paid tiers) — this would
  also break the TMDB non-commercial free-use terms
- Native mobile apps in v1 (PWA instead — see architecture.md)
- Being a "smart" recommendation engine — v1 recommendations are TMDB's
  similar-titles lookup, presented honestly as that

## Target user

You, first. Then your friend group. Not designed for a public/anonymous
audience in v1 — the social features assume people already know each other
(friend requests, not public discovery/follow).

## Core user stories

- As a user, I can sign in with the same account on my phone and my PC and
  see the same watched list on both.
- As a user, I can search for a movie, add it to my watched list with a
  rating, a review, and the date I watched it.
- As a user, my watched list is private by default.
- As a user, I can add friends and, for entries I've marked public, my
  friends can see them.
- As a user, when I add a movie, I can see similar titles as a starting
  point for what to watch next.
- As a user, I can tell the app apart from a generic template — it should
  feel considered, not default.

## Feature scope

See phases.md for the phased breakdown. Summary:

| Feature | Status |
|---|---|
| Auth, cross-device sync | MVP |
| Search, add movie, rate/review | MVP |
| Private watched list | MVP |
| Dark/light mode, user profile button | MVP |
| Friends, public/private sharing | Phase 2 |
| Watchlist (separate from watched) | Phase 3 |
| TV/season tracking | Phase 3 |
| TMDB-based recommendations | Phase 3 |
| Native app wrapper | Phase 4, conditional |
| Real IMDb rating | Phase 4, conditional |

## Explicit product decisions (already made, don't relitigate without reason)

> **Status, 2026-08-31.** Phases 2–4 were built ahead of the usage evidence the
> phase gate called for, at the owner's direction (see phases.md). That changes
> *when* features ship, not *what* was decided below — every entry in this list
> still stands, and the IMDb item in particular is still unbuilt.

- IMDb rating shows "Coming soon" — not fetched from any API. Phase 4 lists
  revisiting this; it has not been revisited. Two things block it: IMDb has no
  free public API (OMDb, the usual substitute, meters its free tier and charges
  past it, which the $0 constraint below rules out), and this list requires the
  decision be reversed here, in writing, before code is written. Neither has
  happened, so the UI still renders the static label.
- No redirect from cast members to their IMDb pages
- No user-uploaded movie logos — TMDB logo or empty placeholder, nothing else
- Movies-only in the data model until TV support is deliberately scoped
  (Phase 3), not organically grown into
- Entirely free to build and run — no paid API tier, no paid hosting, until
  usage numbers force that conversation

## Constraints

- Solo developer, currently learning the stack (Next.js/Supabase) from
  near-zero, alongside university coursework
- $0 budget — every dependency must have a genuinely free tier that fits
  the intended scale
- TMDB non-commercial terms must be respected (attribution required, no
  monetization)

## Success criteria

MVP is successful if: you and at least a few friends are still adding
movies and using the app, unprompted, two to three weeks after it's usable
— without you manually fixing data behind the scenes. If that doesn't
happen, that's a signal to understand why before investing in Phase 2's
social features, not a reason to add more features hoping it helps.

## Risks (see architecture.md and phases.md for detail)

- RLS misconfiguration silently exposing private data — must be tested with
  two real logged-in sessions, not assumed correct
- Scope creep into social/TV features before the MVP is proven
- Supabase free-tier limits, if usage grows past a friend group
- Solo-dev time realism: 6–10 weeks for MVP alone, learning the stack while
  still in classes
