/**
 * The shapes lib/tmdb.ts maps TMDB responses into. Kept separate from that
 * module so client components can import the types without pulling in the
 * server-only file that reads the API key.
 */

/**
 * TMDB numbers films and shows in separate sequences, so a tmdb_id only
 * identifies a title when paired with its media type. Everything downstream —
 * the cache table's primary key, entry rows, routes — carries the pair.
 */
export type MediaType = "movie" | "tv";

export function isMediaType(value: unknown): value is MediaType {
  return value === "movie" || value === "tv";
}

export type TitleSummary = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  release_date: string | null;
  release_year: number | null;
  poster_path: string | null;
  overview: string;
};

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

export type SeasonSummary = {
  season_number: number;
  name: string;
  episode_count: number | null;
  air_date: string | null;
  poster_path: string | null;
};

export type TitleDetail = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  tagline: string | null;
  overview: string;
  release_date: string | null;
  release_year: number | null;
  /** Films: runtime. Shows: typical episode runtime. */
  runtime_minutes: number | null;
  genres: string[];
  poster_path: string | null;
  backdrop_path: string | null;
  /** null when TMDB has no logo — the UI renders the empty slot, never an upload. */
  logo_path: string | null;
  cast: CastMember[];
  /** Empty for films. */
  seasons: SeasonSummary[];
};

/** The subset of TitleDetail cached in the `movies` table. */
export type TitleCacheRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  logo_path: string | null;
};
