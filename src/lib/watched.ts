import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MovieRow, WatchedEntryRow } from "@/lib/supabase/database.types";

/** A watched entry joined with the cached movie metadata it points at. */
export type WatchedEntryWithMovie = WatchedEntryRow & { movie: MovieRow };

type JoinedRow = WatchedEntryRow & { movies: MovieRow | null };

function attachMovie(row: JoinedRow): WatchedEntryWithMovie | null {
  // The foreign key makes an orphan impossible, but the generated join type is
  // nullable — dropping the row is safer than asserting non-null.
  if (!row.movies) return null;

  const { movies, ...entry } = row;
  return { ...entry, movie: movies };
}

const ENTRY_WITH_MOVIE_SELECT = "*, movies (*)";

/**
 * The signed-in user's watched list, most recently watched first.
 *
 * No user_id filter is needed for correctness — RLS restricts this to the
 * caller's own rows — but it is included anyway so the query is obviously
 * correct at the call site and can use the (user_id, watched_on) index.
 */
export async function listWatchedEntries(userId: string): Promise<WatchedEntryWithMovie[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watched_entries")
    .select(ENTRY_WITH_MOVIE_SELECT)
    .eq("user_id", userId)
    .order("watched_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load your watched list: ${error.message}`);
  }

  return ((data ?? []) as JoinedRow[]).map(attachMovie).filter((entry) => entry !== null);
}

/** The caller's entry for one movie, or null if they haven't logged it. */
export async function getWatchedEntry(
  userId: string,
  movieId: number,
): Promise<WatchedEntryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("watched_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("movie_id", movieId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load your entry for this film: ${error.message}`);
  }

  return data;
}

export type WatchedStats = {
  total: number;
  ratedCount: number;
  averageRating: number | null;
  thisYear: number;
};

/** Summary counts for the home feed's stats card. Derived, never stored. */
export function summarizeWatched(entries: WatchedEntryWithMovie[]): WatchedStats {
  const rated = entries.filter((entry) => entry.rating !== null);
  const currentYear = String(new Date().getFullYear());

  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / rated.length
      : null;

  return {
    total: entries.length,
    ratedCount: rated.length,
    averageRating,
    thisYear: entries.filter((entry) => entry.watched_on.startsWith(currentYear)).length,
  };
}
