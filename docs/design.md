# Reelist — design system

## Direction

Bento grid for structure, liquid glass for anything that floats over a
movie's own backdrop image. Dark, cinematic base — not a generic near-black,
and not neumorphism (low-contrast soft shadows don't survive next to busy
poster art). Apple-adjacent typography: legible, geometric UI text, with a
display face that gives movie titles some presence instead of flattening
everything into the same system font.

Reference: movie-app-blueprint.html (the working mockup already built) is
the canonical example of this system in practice — new screens should look
like they belong next to it.

## Color

Two modes, one accent logic in both.

### Dark mode (default)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#15130f` | Page background |
| `--bg-2` | `#1c1914` | Secondary surface (detail screen body) |
| `--surface` | `rgba(255,255,255,0.06)` | Glass panel fill |
| `--surface-strong` | `rgba(255,255,255,0.11)` | Glass panel fill, emphasized |
| `--border-glass` | `rgba(255,255,255,0.14)` | Glass panel border |
| `--text-primary` | `#f3f1ea` | Primary text |
| `--text-secondary` | `#b8b3a6` | Supporting text |
| `--text-muted` | `#7c776a` | Labels, hints |
| `--accent` | `#e4a93f` | Ratings, primary highlights |
| `--accent-2` | `#4fd1c5` | Secondary highlight — use sparingly, not as a second primary |

### Light mode

Derive by inversion, not by inventing a new palette:
- `--bg` → warm off-white, e.g. `#f6f3ec` (not pure white — keep the same
  warm undertone as dark mode's warm black)
- `--bg-2` → `#ffffff`
- `--surface` / `--surface-strong` → same glass logic, but as
  `rgba(20,17,12,0.05)` / `rgba(20,17,12,0.09)` — dark tint on light glass,
  not white
- `--text-primary` → `#1c1913`, `--text-secondary` → `#5c574a`,
  `--text-muted` → `#8b8578`
- `--accent` and `--accent-2` stay the same hex values in both modes —
  don't shift the brand color between modes, only the neutrals

Implement as a `data-theme="light"` attribute on `<html>`, toggled by the
mode switch, with both palettes defined as CSS variables — never hardcode a
color that only works in one mode (this is also called out in
.cursorrules).

### Color usage rule

Two accents only. Gold for anything rating-related. Teal is a secondary
highlight for one or two elements per screen at most — it should never
become a second primary color competing with gold.

## Typography

- **Display** (movie titles, screen headings): Space Grotesk, weight 700 for
  hero-sized titles, 500 for smaller card titles.
- **UI/body** (everything else — labels, reviews, metadata, buttons): Inter,
  weight 400 for body copy, 500 for emphasis. Avoid going heavier than 500
  anywhere — it starts to compete with the display face.
- Type scale (desktop): hero title 26–28px, card title 15–16px, body 14px,
  label/meta 12–13px. Don't introduce sizes outside this scale without a
  reason tied to actual hierarchy.

## Layout patterns

### Bento grid (feeds, dashboards)

Asymmetric grid — one hero card (most recent watch, largest), a tall card,
smaller square cards for the rest. Card size should reflect actual
importance (recency, rating, "yours" vs. "a friend's"), not just fill space
decoratively. Reference the blueprint's 4-column grid with a hero spanning
2×2 as the base pattern; adapt column count down for narrow/mobile
viewports rather than redesigning the concept per breakpoint.

### Liquid glass (detail screens, overlays)

A translucent, blurred panel (`backdrop-filter: blur(...)`) sitting over a
movie's backdrop image. Used for: the add-movie/detail screen, the
logo slot, rating panels, review panels. Not used for: ordinary list rows,
buttons, or anything that isn't literally floating over imagery — glass
loses its meaning if it's applied everywhere.

`.glass` utility (conceptually): translucent surface fill + `border: 0.5px
solid var(--border-glass)` + `backdrop-filter: blur(16–20px)`. Border radius
scales with the element's size — larger radius on big panels, smaller on
compact ones like the logo slot.

## Components carried over from the blueprint

- **Hero card**: backdrop-fill background, bottom gradient shade for text
  legibility, floating rating pill (glass) top-right, title + meta bottom-left.
- **Logo slot**: rounded-square glass panel overlapping the backdrop/body
  boundary; shows the TMDB logo if one exists, otherwise an empty/placeholder
  state — never an upload control.
- **Rating panel**: glass panel, your rating in gold, IMDb rating slot in a
  muted tone reading "Coming soon" — not a number, not styled like a real
  rating until that feature actually ships.
- **Cast row**: circular photo + name only, no link, no glass — plain list
  inside a glass container.

## New elements not yet in the blueprint

- **User profile button**: top-right of the nav, avatar circle (initials
  fallback matching the `.dot`/avatar style already used for friends).
  Opens profile/settings, not a dropdown of unrelated actions.
- **Dark/light mode toggle**: nav-level icon toggle (sun/moon), persists
  the user's choice (local preference, not tied to system-only detection,
  though defaulting to system preference on first load is reasonable).

## What to avoid

- Neumorphism, anywhere.
- A second accent color creeping in beyond gold/teal.
- All-caps labels, tracked-out eyebrow text above headings — sentence case
  throughout.
- Applying `.glass` to elements that aren't over imagery — it becomes noise.
- Numbered step markers unless content is genuinely sequential (phases.md
  is sequential; a settings page is not).
