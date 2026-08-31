"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getMovieDetail, toMovieCacheRow } from "@/lib/tmdb";

export type EntryFormState = { error?: string; saved?: boolean };

const MAX_REVIEW_LENGTH = 4000;

/**
 * Every value is re-validated here, on the server. The same rules exist as
 * Postgres CHECK constraints — a client-side check alone is trivially bypassed
 * (docs/security.md), so this is a second layer, not the only one.
 */
type ParsedEntry = {
  movieId: number;
  rating: number | null;
  review: string | null;
  watchedOn: string;
};

function parseEntry(formData: FormData): ParsedEntry | { error: string } {
  const movieId = Number.parseInt(String(formData.get("movie_id") ?? ""), 10);

  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return { error: "That film could not be identified." };
  }

  const rawRating = String(formData.get("rating") ?? "").trim();
  let rating: number | null = null;

  if (rawRating.length > 0) {
    const parsed = Number.parseFloat(rawRating);

    if (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 5 || (parsed * 2) % 1 !== 0) {
      return { error: "Give a rating between 0.5 and 5, in half steps." };
    }

    rating = parsed;
  }

  const watchedOn = String(formData.get("watched_on") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(watchedOn) || Number.isNaN(Date.parse(watchedOn))) {
    return { error: "Pick the date you watched it." };
  }

  // Compared against the server's own date; a client clock set forward can't
  // slip a future entry through.
  if (watchedOn > new Date().toISOString().slice(0, 10)) {
    return { error: "You can't log a film you haven't watched yet." };
  }

  const rawReview = String(formData.get("review") ?? "").trim();

  if (rawReview.length > MAX_REVIEW_LENGTH) {
    return { error: `Keep the review under ${MAX_REVIEW_LENGTH} characters.` };
  }

  return {
    movieId,
    rating,
    review: rawReview.length > 0 ? rawReview : null,
    watchedOn,
  };
}

function isParseError(value: ParsedEntry | { error: string }): value is { error: string } {
  return "error" in value;
}

/**
 * Caches the title's metadata, then writes the caller's watched entry.
 *
 * The metadata is re-fetched from TMDB rather than taken from the form, so the
 * cache row can only ever contain what TMDB actually returned — a tampered form
 * post cannot write an arbitrary title or image path.
 */
export async function saveWatchedEntry(
  _state: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const parsed = parseEntry(formData);

  if (isParseError(parsed)) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Sign in again." };
  }

  try {
    const detail = await getMovieDetail(parsed.movieId);

    const { error: cacheError } = await supabase
      .from("movies")
      .upsert(toMovieCacheRow(detail), { onConflict: "tmdb_id" });

    if (cacheError) {
      console.error("Caching movie failed", cacheError);
      return { error: "Could not save this film's details. Try again." };
    }
  } catch (error) {
    console.error("TMDB lookup failed while saving", error);
    return { error: "Could not reach TMDB to confirm this film. Try again in a moment." };
  }

  // user_id comes from the verified session, never from the form. RLS would
  // reject anything else anyway, but the value should never be attacker-supplied
  // in the first place.
  const { error } = await supabase.from("watched_entries").upsert(
    {
      user_id: user.id,
      movie_id: parsed.movieId,
      rating: parsed.rating,
      review: parsed.review,
      watched_on: parsed.watchedOn,
    },
    { onConflict: "user_id,movie_id" },
  );

  if (error) {
    console.error("Saving watched entry failed", error);
    return { error: "Could not save your entry. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/movie/${parsed.movieId}`);

  return { saved: true };
}

export async function removeWatchedEntry(
  _state: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const movieId = Number.parseInt(String(formData.get("movie_id") ?? ""), 10);

  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return { error: "That film could not be identified." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Sign in again." };
  }

  const { error } = await supabase
    .from("watched_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("movie_id", movieId);

  if (error) {
    console.error("Removing watched entry failed", error);
    return { error: "Could not remove this entry. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/movie/${movieId}`);

  return { saved: true };
}
