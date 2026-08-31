import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  MovieRow,
  TitleSeasonRow,
  WatchedEntryRow,
  WatchedSeasonRow,
  WatchlistEntryRow,
} from "@/lib/supabase/database.types";
import type { MediaType } from "@/lib/tmdb-types";

/** An entry joined with the cached title metadata it points at. */
export type WatchedEntryWithTitle = WatchedEntryRow & { title: MovieRow };
export type WatchlistEntryWithTitle = WatchlistEntryRow & { title: MovieRow };

type JoinedWatched = WatchedEntryRow & { movies: MovieRow | null };
type JoinedWatchlist = WatchlistEntryRow & { movies: MovieRow | null };

const ENTRY_SELECT = "*, movies (*)";

function attachTitle<T extends { movies: MovieRow | null }>(
  row: T,
): (Omit<T, "movies"> & { title: MovieRow }) | null {
  // The foreign key makes an orphan impossible, but the generated join type is
  // nullable — dropping the row is safer than asserting non-null.
  if (!row.movies) return null;

  const { movies, ...entry } = row;
  return { ...entry, title: movies };
}

/**
 * A user's watched list, most recently watched first.
 *
 * RLS decides what comes back: your own rows always, plus a friend's rows that
 * are marked public. Passing someone else's id is therefore safe — it cannot
 * return more than that person has shared with you.
 */
export async function listWatchedEntries(userId: string): Promise<WatchedEntryWithTitle[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watched_entries")
    .select(ENTRY_SELECT)
    .eq("user_id", userId)
    .order("watched_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load the watched list: ${error.message}`);
  }

  return ((data ?? []) as JoinedWatched[])
    .map(attachTitle)
    .filter((entry) => entry !== null);
}

export async function listWatchlistEntries(userId: string): Promise<WatchlistEntryWithTitle[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watchlist_entries")
    .select(ENTRY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load the watchlist: ${error.message}`);
  }

  return ((data ?? []) as JoinedWatchlist[])
    .map(attachTitle)
    .filter((entry) => entry !== null);
}

/** The caller's entry for one title, or null if they haven't logged it. */
export async function getWatchedEntry(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<WatchedEntryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watched_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("movie_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load your entry: ${error.message}`);
  }

  return data;
}

export async function getWatchlistEntry(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<WatchlistEntryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watchlist_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("movie_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load your watchlist entry: ${error.message}`);
  }

  return data;
}

/** Which seasons of a series entry are marked watched. */
export async function listWatchedSeasons(entryId: string): Promise<WatchedSeasonRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watched_seasons")
    .select("*")
    .eq("entry_id", entryId)
    .order("season_number", { ascending: true });

  if (error) {
    throw new Error(`Could not load your season progress: ${error.message}`);
  }

  return data ?? [];
}

export async function listCachedSeasons(showId: number): Promise<TitleSeasonRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("title_seasons")
    .select("*")
    .eq("show_id", showId)
    .order("season_number", { ascending: true });

  if (error) {
    throw new Error(`Could not load season details: ${error.message}`);
  }

  return data ?? [];
}

export type WatchedStats = {
  total: number;
  films: number;
  series: number;
  ratedCount: number;
  averageRating: number | null;
  thisYear: number;
};

/** Summary counts for the home feed's stats row. Derived, never stored. */
export function summarizeWatched(entries: WatchedEntryWithTitle[]): WatchedStats {
  const rated = entries.filter((entry) => entry.rating !== null);
  const currentYear = String(new Date().getFullYear());

  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / rated.length
      : null;

  return {
    total: entries.length,
    films: entries.filter((entry) => entry.media_type === "movie").length,
    series: entries.filter((entry) => entry.media_type === "tv").length,
    ratedCount: rated.length,
    averageRating,
    thisYear: entries.filter((entry) => entry.watched_on.startsWith(currentYear)).length,
  };
}
