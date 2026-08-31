import "server-only";

/**
 * The single place TMDB responses are shaped (per .cursorrules). Nothing else in
 * the app should know TMDB's raw field names — components consume the mapped
 * types below.
 *
 * `server-only` above is the guard that makes the key leak a build error rather
 * than a runtime surprise: importing this file from a client component fails the
 * build instead of quietly shipping TMDB_API_KEY to the browser.
 *
 * Films and shows are normalised into one shape here, so nothing downstream has
 * to remember that TMDB calls a show's name `name` and its date `first_air_date`.
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Image URLs are built in lib/tmdb-image.ts so client components can use them
// without importing this server-only module. Re-exported here so callers that
// already have this module imported don't need a second import.
export { tmdbImageUrl, type TmdbImageSize } from "@/lib/tmdb-image";

import {
  isMediaType,
  type CastMember,
  type MediaType,
  type SeasonSummary,
  type TitleCacheRow,
  type TitleDetail,
  type TitleSummary,
} from "@/lib/tmdb-types";

// Mapped response shapes live in lib/tmdb-types.ts so client components can
// import them without pulling in this server-only module.
export type {
  MediaType,
  TitleSummary,
  CastMember,
  SeasonSummary,
  TitleDetail,
  TitleCacheRow,
} from "@/lib/tmdb-types";

export class TmdbError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

function readApiKey(): string {
  const key = process.env.TMDB_API_KEY;

  if (!key) {
    throw new TmdbError(
      "TMDB_API_KEY is not set. Copy .env.example to .env.local and fill it in.",
      500,
    );
  }

  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", readApiKey());
  url.searchParams.set("language", "en-US");

  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    // Title metadata barely changes; a day of caching keeps us far inside
    // TMDB's rate limits and makes repeat views instant.
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    // Deliberately does not echo TMDB's body — it would contain the query string,
    // and with it the API key, in any error surfaced upward.
    throw new TmdbError(`TMDB request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

function releaseYear(releaseDate: string | null): number | null {
  if (!releaseDate) return null;

  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/** TMDB returns "" rather than null for missing dates. */
function normalizeDate(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

type RawSearchResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
};

type RawImage = {
  file_path: string;
  iso_639_1: string | null;
  vote_average?: number;
};

type RawCredit = {
  id: number;
  name?: string;
  character?: string;
  roles?: { character?: string }[];
  profile_path?: string | null;
  order?: number;
};

type RawSeason = {
  season_number: number;
  name?: string;
  episode_count?: number;
  air_date?: string;
  poster_path?: string | null;
};

type RawTitleDetail = {
  id: number;
  title?: string;
  name?: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  seasons?: RawSeason[];
  images?: { logos?: RawImage[] };
  credits?: { cast?: RawCredit[] };
  aggregate_credits?: { cast?: RawCredit[] };
};

/** Films carry `title`/`release_date`; shows carry `name`/`first_air_date`. */
function displayTitle(raw: { title?: string; name?: string }): string {
  return raw.title ?? raw.name ?? "Untitled";
}

function displayDate(raw: { release_date?: string; first_air_date?: string }): string | null {
  return normalizeDate(raw.release_date ?? raw.first_air_date);
}

function mapSearchResult(raw: RawSearchResult, mediaType: MediaType): TitleSummary {
  const release_date = displayDate(raw);

  return {
    tmdb_id: raw.id,
    media_type: mediaType,
    title: displayTitle(raw),
    release_date,
    release_year: releaseYear(release_date),
    poster_path: raw.poster_path ?? null,
    overview: raw.overview ?? "",
  };
}

/**
 * Prefers an English logo, then a language-agnostic one, then whatever exists.
 * Returns null when TMDB has none — that is the placeholder case, not an error.
 */
function pickLogoPath(logos: RawImage[] | undefined): string | null {
  if (!logos || logos.length === 0) return null;

  const byPreference =
    logos.filter((logo) => logo.iso_639_1 === "en").sort(byVotes)[0] ??
    logos.filter((logo) => logo.iso_639_1 === null).sort(byVotes)[0] ??
    [...logos].sort(byVotes)[0];

  return byPreference?.file_path ?? null;
}

function byVotes(a: RawImage, b: RawImage): number {
  return (b.vote_average ?? 0) - (a.vote_average ?? 0);
}

const MAX_CAST_MEMBERS = 12;

function mapCast(credits: RawCredit[] | undefined): CastMember[] {
  if (!credits) return [];

  return credits
    .slice()
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .slice(0, MAX_CAST_MEMBERS)
    .map((member) => ({
      id: member.id,
      name: member.name ?? "Unknown",
      // Series credits nest the character under `roles` rather than exposing it
      // directly, since a regular can play different parts across seasons.
      character: member.character ?? member.roles?.[0]?.character ?? "",
      profile_path: member.profile_path ?? null,
    }));
}

function mapSeasons(seasons: RawSeason[] | undefined): SeasonSummary[] {
  if (!seasons) return [];

  return seasons
    .slice()
    .sort((a, b) => a.season_number - b.season_number)
    .map((season) => ({
      season_number: season.season_number,
      name: season.name ?? `Season ${season.season_number}`,
      episode_count: season.episode_count ?? null,
      air_date: normalizeDate(season.air_date),
      poster_path: season.poster_path ?? null,
    }));
}

function runtimeOf(raw: RawTitleDetail): number | null {
  if (raw.runtime && raw.runtime > 0) return raw.runtime;

  const episodeRuntime = raw.episode_run_time?.find((value) => value > 0);
  return episodeRuntime ?? null;
}

function mapTitleDetail(raw: RawTitleDetail, mediaType: MediaType): TitleDetail {
  const release_date = displayDate(raw);

  return {
    tmdb_id: raw.id,
    media_type: mediaType,
    title: displayTitle(raw),
    tagline: raw.tagline && raw.tagline.length > 0 ? raw.tagline : null,
    overview: raw.overview ?? "",
    release_date,
    release_year: releaseYear(release_date),
    runtime_minutes: runtimeOf(raw),
    genres: (raw.genres ?? []).map((genre) => genre.name),
    poster_path: raw.poster_path ?? null,
    backdrop_path: raw.backdrop_path ?? null,
    logo_path: pickLogoPath(raw.images?.logos),
    cast: mapCast(raw.credits?.cast ?? raw.aggregate_credits?.cast),
    seasons: mediaType === "tv" ? mapSeasons(raw.seasons) : [],
  };
}

/**
 * Searches films and shows together. TMDB's multi endpoint also returns people;
 * those are dropped rather than shown, since nothing in the app can be done with
 * a person.
 */
export async function searchTitles(query: string): Promise<TitleSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const data = await tmdbFetch<{ results?: RawSearchResult[] }>("/search/multi", {
    query: trimmed,
    include_adult: "false",
    page: "1",
  });

  return (data.results ?? [])
    .filter((result) => isMediaType(result.media_type))
    .map((result) => mapSearchResult(result, result.media_type as MediaType));
}

/**
 * Details, images and credits in one request via append_to_response, so adding a
 * title is a single round trip rather than three.
 */
export async function getTitleDetail(
  mediaType: MediaType,
  tmdbId: number,
): Promise<TitleDetail> {
  // Series use aggregate_credits: `credits` on a show returns only the current
  // season's cast, which reads as wrong for anything long-running.
  const credits = mediaType === "tv" ? "aggregate_credits" : "credits";

  const data = await tmdbFetch<RawTitleDetail>(`/${mediaType}/${tmdbId}`, {
    append_to_response: `images,${credits}`,
    // Logos are often language-tagged; without this TMDB filters them out
    // entirely when `language` is set.
    include_image_language: "en,null",
  });

  return mapTitleDetail(data, mediaType);
}

/**
 * TMDB's "similar" lookup. This is a lookup, not a recommendation engine, and
 * docs/prd.md is explicit that it must be presented to users as exactly that.
 */
export async function getSimilarTitles(
  mediaType: MediaType,
  tmdbId: number,
  limit = 8,
): Promise<TitleSummary[]> {
  const data = await tmdbFetch<{ results?: RawSearchResult[] }>(
    `/${mediaType}/${tmdbId}/similar`,
    { page: "1" },
  );

  return (data.results ?? []).slice(0, limit).map((result) => mapSearchResult(result, mediaType));
}

/** Narrows a full detail record to the columns the `movies` cache table holds. */
export function toTitleCacheRow(detail: TitleDetail): TitleCacheRow {
  return {
    tmdb_id: detail.tmdb_id,
    media_type: detail.media_type,
    title: detail.title,
    release_date: detail.release_date,
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    logo_path: detail.logo_path,
  };
}
