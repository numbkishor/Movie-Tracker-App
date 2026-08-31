# Reelist — review checklist

A short, honest checklist to run through before merging anything — solo
projects don't get a second pair of eyes by default, so this file is
standing in for one. Doesn't need to be ceremonial; just actually check
each box in your head (or literally, if that helps you).

## Before writing the code

- [ ] Is this feature actually in the current phase (phases.md), or is it
      scope creep from a later phase?
- [ ] Does it touch a table with user data? If so, re-read the RLS section
      of security.md before starting.
- [ ] Does it match an existing pattern in architecture.md/design.md, or is
      it introducing a new one that should be documented instead of
      one-offed?

## Before merging / shipping

**Correctness**
- [ ] Works on both a fresh account and an account with existing data
- [ ] Works after a page reload, not just in the current session
- [ ] Tested on both mobile viewport and desktop width

**Security** (see security.md for detail)
- [ ] No API key or service-role key appears in any client-side code or
      bundle
- [ ] New or changed table has RLS enabled, and was tested with two
      separate logged-in sessions — one as the owner, one as someone else
- [ ] User-submitted text is rendered as text, not injected as HTML
- [ ] No new dependency added without a real reason

**Design consistency** (see design.md)
- [ ] Uses existing color tokens, not a new hardcoded hex value
- [ ] Works in both dark and light mode, not just the one you were looking
      at while building
- [ ] Glass effect only used on elements floating over imagery, not applied
      as decoration elsewhere
- [ ] Typography follows the Space Grotesk (display) / Inter (UI) split,
      no new font introduced

**Code quality** (see .cursorrules)
- [ ] No TypeScript `any` without a comment explaining why
- [ ] TMDB response shaping stays in the shared mapper, not duplicated
      inline
- [ ] Naming matches the conventions in .cursorrules (kebab-case files,
      PascalCase components, snake_case DB columns)

**Product scope** (see prd.md)
- [ ] Doesn't quietly reintroduce something on the "explicit decisions"
      list (IMDb rating via API, cast-to-IMDb links, logo uploads) — if you
      genuinely want to revisit one of those, update prd.md first, don't
      just build around it

## After shipping

- [ ] Actually use the feature yourself for a few days before considering
      it done — not just tested once during development
- [ ] If it's a Phase 1 feature, note whether you and friends are actually
      using it unprompted (this is the real signal for whether to build
      Phase 2 — see the success criteria in prd.md)

## Red flags worth stopping for

- A change that "just needs" RLS disabled to work — it needs a correct
  policy, not a disabled one.
- A feature that's easier to build with the service-role key than the anon
  key — that's usually a sign it should be a server-side operation, not a
  reason to expose more access to the client.
- Copy-pasting a similar-but-not-identical RLS policy without re-deriving
  whether it's actually correct for the new table.
