/**
 * Route builders. Deliberately dependency-free so client components can import
 * them without dragging in a server-only module — that mistake is what the
 * `server-only` guard in lib/titles.ts is there to catch.
 */

/**
 * The canonical URL for a title. Media type is part of the path because TMDB
 * numbers films and series separately, so an id alone is ambiguous.
 */
export function titleHref(mediaType: string, tmdbId: number): string {
  return `/title/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}`;
}

export function personHref(username: string): string {
  return `/u/${username}`;
}
