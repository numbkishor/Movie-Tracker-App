"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getTitleDetail, toTitleCacheRow } from "@/lib/tmdb";
import { isMediaType, type MediaType } from "@/lib/tmdb-types";
import { titleHref } from "@/lib/routes";

export type EntryFormState = { error?: string; saved?: boolean };

const MAX_REVIEW_LENGTH = 4000;

type TitleRef = { tmdbId: number; mediaType: MediaType };

function readTitleRef(formData: FormData): TitleRef | null {
  const tmdbId = Number.parseInt(String(formData.get("tmdb_id") ?? ""), 10);
  const mediaType = String(formData.get("media_type") ?? "");

  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0 || !isMediaType(mediaType)) {
    return null;
  }

  return { tmdbId, mediaType };
}

/**
 * Caches a title's metadata straight from TMDB, so the cache row can only ever
 * contain what TMDB actually returned — a tampered form post cannot write an
 * arbitrary title or image path. Series also get their season list cached, so a
 * shared list renders season names without every viewer hitting TMDB.
 */
async function cacheTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ref: TitleRef,
): Promise<string | null> {
  try {
    const detail = await getTitleDetail(ref.mediaType, ref.tmdbId);

    const { error } = await supabase
      .from("movies")
      .upsert(toTitleCacheRow(detail), { onConflict: "tmdb_id,media_type" });

    if (error) {
      console.error("Caching title failed", error);
      return "Could not save this title's details. Try again.";
    }

    if (detail.media_type === "tv" && detail.seasons.length > 0) {
      const { error: seasonError } = await supabase.from("title_seasons").upsert(
        detail.seasons.map((season) => ({
          show_id: detail.tmdb_id,
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episode_count,
          air_date: season.air_date,
          poster_path: season.poster_path,
        })),
        { onConflict: "show_id,season_number" },
      );

      if (seasonError) {
        console.error("Caching seasons failed", seasonError);
      }
    }

    return null;
  } catch (error) {
    console.error("TMDB lookup failed while saving", error);
    return "Could not reach TMDB to confirm this title. Try again in a moment.";
  }
}

/**
 * Every value is re-validated here, on the server. The same rules exist as
 * Postgres CHECK constraints — a client-side check alone is trivially bypassed
 * (docs/security.md), so this is a second layer, not the only one.
 */
type ParsedEntry = {
  rating: number | null;
  review: string | null;
  watchedOn: string;
  isPublic: boolean;
};

function parseEntry(formData: FormData): ParsedEntry | { error: string } {
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
    return { error: "You can't log something you haven't watched yet." };
  }

  const rawReview = String(formData.get("review") ?? "").trim();

  if (rawReview.length > MAX_REVIEW_LENGTH) {
    return { error: `Keep the review under ${MAX_REVIEW_LENGTH} characters.` };
  }

  return {
    rating,
    review: rawReview.length > 0 ? rawReview : null,
    watchedOn,
    // Absent checkbox means unchecked, which is the private default.
    isPublic: formData.get("is_public") === "on",
  };
}

function isParseError(value: ParsedEntry | { error: string }): value is { error: string } {
  return "error" in value;
}

export async function saveWatchedEntry(
  _state: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const ref = readTitleRef(formData);
  if (!ref) return { error: "That title could not be identified." };

  const parsed = parseEntry(formData);
  if (isParseError(parsed)) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired. Sign in again." };

  const cacheError = await cacheTitle(supabase, ref);
  if (cacheError) return { error: cacheError };

  // user_id comes from the verified session, never from the form. RLS would
  // reject anything else anyway, but the value should never be attacker-supplied
  // in the first place.
  const { error } = await supabase.from("watched_entries").upsert(
    {
      user_id: user.id,
      movie_id: ref.tmdbId,
      media_type: ref.mediaType,
      rating: parsed.rating,
      review: parsed.review,
      watched_on: parsed.watchedOn,
      is_public: parsed.isPublic,
    },
    { onConflict: "user_id,movie_id,media_type" },
  );

  if (error) {
    console.error("Saving watched entry failed", error);
    return { error: "Could not save your entry. Try again." };
  }

  // Logging something you had queued takes it off the queue.
  await supabase
    .from("watchlist_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("movie_id", ref.tmdbId)
    .eq("media_type", ref.mediaType);

  revalidateTitle(ref);
  return { saved: true };
}

export async function removeWatchedEntry(
  _state: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const ref = readTitleRef(formData);
  if (!ref) return { error: "That title could not be identified." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("watched_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("movie_id", ref.tmdbId)
    .eq("media_type", ref.mediaType);

  if (error) {
    console.error("Removing watched entry failed", error);
    return { error: "Could not remove this entry. Try again." };
  }

  revalidateTitle(ref);
  return { saved: true };
}

export async function toggleWatchlistEntry(
  _state: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const ref = readTitleRef(formData);
  if (!ref) return { error: "That title could not be identified." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: existing, error: lookupError } = await supabase
    .from("watchlist_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("movie_id", ref.tmdbId)
    .eq("media_type", ref.mediaType)
    .maybeSingle();

  if (lookupError) {
    console.error("Reading watchlist entry failed", lookupError);
    return { error: "Could not update your watchlist. Try again." };
  }

  if (existing) {
    const { error } = await supabase.from("watchlist_entries").delete().eq("id", existing.id);

    if (error) {
      console.error("Removing watchlist entry failed", error);
      return { error: "Could not update your watchlist. Try again." };
    }

    revalidateTitle(ref);
    return { saved: true };
  }

  const cacheError = await cacheTitle(supabase, ref);
  if (cacheError) return { error: cacheError };

  const { error } = await supabase.from("watchlist_entries").insert({
    user_id: user.id,
    movie_id: ref.tmdbId,
    media_type: ref.mediaType,
    is_public: formData.get("is_public") === "on",
  });

  if (error) {
    console.error("Adding watchlist entry failed", error);
    return { error: "Could not update your watchlist. Try again." };
  }

  revalidateTitle(ref);
  return { saved: true };
}

/** Marks one season of a series watched, or unmarks it. */
export async function toggleWatchedSeason(
  _state: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const ref = readTitleRef(formData);
  if (!ref) return { error: "That title could not be identified." };

  const seasonNumber = Number.parseInt(String(formData.get("season_number") ?? ""), 10);

  if (!Number.isSafeInteger(seasonNumber) || seasonNumber < 0 || seasonNumber > 200) {
    return { error: "That season could not be identified." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired. Sign in again." };

  // Season progress hangs off the series entry, so there has to be one first.
  const { data: entry, error: entryError } = await supabase
    .from("watched_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("movie_id", ref.tmdbId)
    .eq("media_type", ref.mediaType)
    .maybeSingle();

  if (entryError) {
    console.error("Reading series entry failed", entryError);
    return { error: "Could not update your season progress. Try again." };
  }

  if (!entry) {
    return { error: "Add the series to your list before marking seasons." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("watched_seasons")
    .select("id")
    .eq("entry_id", entry.id)
    .eq("season_number", seasonNumber)
    .maybeSingle();

  if (lookupError) {
    console.error("Reading season progress failed", lookupError);
    return { error: "Could not update your season progress. Try again." };
  }

  const { error } = existing
    ? await supabase.from("watched_seasons").delete().eq("id", existing.id)
    : await supabase
        .from("watched_seasons")
        .insert({ entry_id: entry.id, season_number: seasonNumber });

  if (error) {
    console.error("Updating season progress failed", error);
    return { error: "Could not update your season progress. Try again." };
  }

  revalidateTitle(ref);
  return { saved: true };
}

function revalidateTitle(ref: TitleRef): void {
  revalidatePath("/");
  revalidatePath("/watchlist");
  revalidatePath(titleHref(ref.mediaType, ref.tmdbId));
}
