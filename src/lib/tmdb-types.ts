/**
 * The shapes lib/tmdb.ts maps TMDB responses into. Kept separate from that
 * module so client components can import the types without pulling in the
 * server-only file that reads the API key.
 */

export type MovieSummary = {
  tmdb_id: number;
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

export type MovieDetail = {
  tmdb_id: number;
  media_type: "movie";
  title: string;
  tagline: string | null;
  overview: string;
  release_date: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  genres: string[];
  poster_path: string | null;
  backdrop_path: string | null;
  /** null when TMDB has no logo — the UI renders the empty slot, never an upload. */
  logo_path: string | null;
  cast: CastMember[];
};

/** The subset of MovieDetail cached in the `movies` table. */
export type MovieCacheRow = {
  tmdb_id: number;
  media_type: "movie";
  title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  logo_path: string | null;
};
