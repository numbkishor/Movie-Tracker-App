import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { CastRow } from "@/components/movie/cast-row";
import { LogoSlot } from "@/components/movie/logo-slot";
import { RatingPanel } from "@/components/movie/rating-panel";
import { SeasonList } from "@/components/movie/season-list";
import { SimilarTitles } from "@/components/movie/similar-titles";
import { WatchedEntryForm } from "@/components/movie/watched-entry-form";
import { MediaBadge } from "@/components/ui/media-badge";
import { Poster } from "@/components/ui/poster";
import { formatDate, formatRuntime } from "@/lib/format";
import { getSignedInUser } from "@/lib/auth";
import { getSimilarTitles, getTitleDetail, TmdbError } from "@/lib/tmdb";
import { isMediaType, type MediaType } from "@/lib/tmdb-types";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { getWatchedEntry, getWatchlistEntry, listWatchedSeasons } from "@/lib/titles";
import {
  removeWatchedEntry,
  saveWatchedEntry,
  toggleWatchedSeason,
  toggleWatchlistEntry,
} from "./actions";

export const dynamic = "force-dynamic";

type RouteParams = { media: string; id: string };

function parseRoute(params: RouteParams): { mediaType: MediaType; tmdbId: number } | null {
  const tmdbId = Number.parseInt(params.id, 10);

  if (!isMediaType(params.media) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    return null;
  }

  return { mediaType: params.media, tmdbId };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const route = parseRoute(await params);
  if (!route) return { title: "Title" };

  try {
    const title = await getTitleDetail(route.mediaType, route.tmdbId);
    return { title: title.title };
  } catch {
    return { title: "Title" };
  }
}

export default async function TitlePage({ params }: { params: Promise<RouteParams> }) {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");

  const route = parseRoute(await params);
  if (!route) notFound();

  let title;
  try {
    title = await getTitleDetail(route.mediaType, route.tmdbId);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }

  const [entry, watchlistEntry, similar] = await Promise.all([
    getWatchedEntry(user.id, route.tmdbId, route.mediaType),
    getWatchlistEntry(user.id, route.tmdbId, route.mediaType),
    // A similar-titles failure should never take the page down with it — it is
    // the least important thing on screen.
    getSimilarTitles(route.mediaType, route.tmdbId).catch(() => []),
  ]);

  const watchedSeasons = entry ? await listWatchedSeasons(entry.id) : [];

  const backdrop = tmdbImageUrl(title.backdrop_path, "w1280");
  const releaseDate = formatDate(title.release_date);
  const runtime = formatRuntime(title.runtime_minutes);

  return (
    <article className="flex flex-col gap-6">
      {/* Backdrop + the glass panels floating over it — the one place design.md
          wants the glass treatment. */}
      <header className="relative -mx-4 sm:-mx-6">
        <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
          {backdrop ? (
            <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : (
            <div className="h-full w-full bg-surface-strong" />
          )}
          <div className="backdrop-shade absolute inset-0" />
        </div>

        <div className="relative -mt-12 flex items-end gap-4 px-4 sm:-mt-14 sm:px-6">
          <LogoSlot title={title.title} logoPath={title.logo_path} />

          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <h1 className="font-display text-hero font-bold leading-tight text-text-primary">
              {title.title}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-label text-text-secondary">
              <MediaBadge mediaType={title.media_type} />
              <span>
                {[
                  releaseDate,
                  runtime ? (title.media_type === "tv" ? `${runtime} per episode` : runtime) : null,
                  title.genres.slice(0, 2).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {title.tagline ? (
            <p className="font-display text-subhead font-medium text-text-secondary">
              {title.tagline}
            </p>
          ) : null}

          {title.overview ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-label font-medium text-text-secondary">Overview</h2>
              {/* Rendered as text, never as HTML. */}
              <p className="max-w-prose text-body text-text-primary">{title.overview}</p>
            </section>
          ) : null}

          <RatingPanel rating={entry?.rating ?? null} />

          {entry?.review ? (
            <section className="flex flex-col gap-2 rounded-glass border border-glass-border bg-bg-2 p-4">
              <h2 className="text-label font-medium text-text-secondary">Your review</h2>
              <p className="whitespace-pre-wrap text-body text-text-primary">{entry.review}</p>
            </section>
          ) : null}

          {title.media_type === "tv" ? (
            <SeasonList
              tmdbId={title.tmdb_id}
              mediaType={title.media_type}
              seasons={title.seasons}
              watchedSeasonNumbers={watchedSeasons.map((season) => season.season_number)}
              hasEntry={entry !== null}
              action={toggleWatchedSeason}
            />
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-label font-medium text-text-secondary">Cast</h2>
            <CastRow cast={title.cast} />
          </section>

          <SimilarTitles
            heading="Similar titles"
            caption="TMDB's own similar-titles list for this one — not personalised to you."
            titles={similar}
          />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-4 rounded-glass border border-glass-border bg-bg-2 p-4">
            <span className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-glass-sm bg-surface-strong">
              <Poster
                title={title.title}
                posterPath={title.poster_path}
                size="w342"
                sizes="72px"
              />
            </span>

            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-display text-card font-medium">
                {entry ? "Your entry" : `Log this ${title.media_type === "tv" ? "series" : "film"}`}
              </h2>
              <p className="text-meta text-text-muted">
                {entry
                  ? entry.is_public
                    ? "Shared with your friends"
                    : "Private to you"
                  : "Private unless you share it"}
              </p>
            </div>
          </div>

          <div className="rounded-glass border border-glass-border bg-bg-2 p-4">
            <WatchedEntryForm
              tmdbId={title.tmdb_id}
              mediaType={title.media_type}
              entry={entry}
              watchlistEntry={watchlistEntry}
              saveAction={saveWatchedEntry}
              removeAction={removeWatchedEntry}
              watchlistAction={toggleWatchlistEntry}
            />
          </div>
        </aside>
      </div>
    </article>
  );
}
