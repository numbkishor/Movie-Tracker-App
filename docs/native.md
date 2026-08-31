# Reelist — native app wrapper (Phase 4)

Phase 4 of phases.md describes an app-store presence via Capacitor wrapping the
existing PWA. This file is that wrapper, set up but not built — see the caveats
at the bottom before you ship anything from here.

## What is committed

`capacitor.config.json` at the repo root. It points a native shell at the
deployed Vercel URL rather than bundling a copy of the app, so:

- there is one deployment, and the native app picks up every web deploy without
  an app-store review cycle;
- Supabase auth keeps working unchanged, because the shell is a real browser
  context on the same origin the web app uses;
- `webDir` points at `public/` only because Capacitor requires the field. In
  server-URL mode nothing is served from it.

Set `server.url` to your own deployment before building — the committed value is
a placeholder.

## Why the Capacitor packages are not in package.json

`@capacitor/cli` currently pulls in `xcode` → `uuid`, which carries a moderate
advisory (GHSA-w5hq-g745-h8pq). It is a build-time-only dependency and the
affected code path is not one this project would reach, but docs/security.md
asks that dependencies stay minimal and that `npm audit` stay clean — and a
package needed only when generating native projects does not have to sit in the
lockfile of the web app to earn its place.

So the commands below run it through `npx` instead. Nothing about the native
build gets slower, and `npm audit` on the web app stays at zero.

## Generating the native projects

You need Android Studio (for Android) or a Mac with Xcode (for iOS). Neither can
run in CI here, so **none of the steps below have been executed** — they are the
documented path, not a verified one.

```bash
npx @capacitor/cli@latest add android
npx @capacitor/cli@latest add ios      # macOS only

npx @capacitor/cli@latest sync
npx @capacitor/cli@latest open android
```

`android/` and `ios/` are generated directories. Decide deliberately whether to
commit them — Capacitor's own guidance is to commit them, since they hold
signing config and native tweaks you will not want to regenerate.

## Before you go near an app store

phases.md is explicit that this step is conditional: *"revisit the 'should this
be a native app' question with real usage numbers in hand, not speculation."*
That question has not been revisited. Both stores also reject shells that add
nothing over the website, and a server-URL wrapper is exactly that shape — so
have an answer for what the native build gives users that the installable PWA
does not, before you submit.
