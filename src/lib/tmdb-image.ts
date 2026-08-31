/**
 * Image-URL building, split out from lib/tmdb.ts so client components can use it
 * without importing the server-only module that holds the API key.
 */

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w300"
  | "w342"
  | "w500"
  | "w780"
  | "w1280"
  | "original";

export function tmdbImageUrl(path: string | null, size: TmdbImageSize): string | null {
  if (!path) return null;

  // Only TMDB's own `/abc123.jpg` shape is interpolated; anything else — a full
  // URL from a poisoned cache row, say — is treated as "no image".
  if (!/^\/[A-Za-z0-9._-]+$/.test(path)) return null;

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}
