import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { CastRow } from "@/components/movie/cast-row";
import { LogoSlot } from "@/components/movie/logo-slot";
import { RatingPanel } from "@/components/movie/rating-panel";
import { WatchedEntryForm } from "@/components/movie/watched-entry-form";
import { Poster } from "@/components/ui/poster";
import { formatDate, formatRuntime } from "@/lib/format";
import { getSignedInUser } from "@/lib/auth";
import { getMovieDetail, TmdbError } from "@/lib/tmdb";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { getWatchedEntry } from "@/lib/watched";
import { removeWatchedEntry, saveWatchedEntry } from "./actions";

export const dynamic = "force-dynamic";

function parseTmdbId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = parseTmdbId(id);

  if (!tmdbId) return { title: "Film" };

  try {
    const movie = await getMovieDetail(tmdbId);
    return { title: movie.title };
  } catch {
    return { title: "Film" };
  }
}

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const tmdbId = parseTmdbId(id);

  if (!tmdbId) notFound();

  let movie;
  try {
    movie = await getMovieDetail(tmdbId);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }

  const entry = await getWatchedEntry(user.id, tmdbId);

  const backdrop = tmdbImageUrl(movie.backdrop_path, "w1280");
  const releaseDate = formatDate(movie.release_date);
  const runtime = formatRuntime(movie.runtime_minutes);

  return (
    <article className="flex flex-col gap-6">
      {/* Backdrop + the glass panels floating over it — the one place design.md
          wants the glass treatment. */}
      <header className="relative -mx-4 sm:-mx-6">
        <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
          {backdrop ? (
            <Image
              src={backdrop}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-surface-strong" />
          )}
          <div className="backdrop-shade absolute inset-0" />
        </div>

        <div className="relative -mt-12 flex items-end gap-4 px-4 sm:-mt-14 sm:px-6">
          <LogoSlot title={movie.title} logoPath={movie.logo_path} />

          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <h1 className="font-display text-hero font-bold leading-tight text-text-primary">
              {movie.title}
            </h1>
            <p className="text-label text-text-secondary">
              {[releaseDate, runtime, movie.genres.slice(0, 2).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {movie.tagline ? (
            <p className="font-display text-subhead font-medium text-text-secondary">
              {movie.tagline}
            </p>
          ) : null}

          {movie.overview ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-label font-medium text-text-secondary">Overview</h2>
              {/* Rendered as text, never as HTML. */}
              <p className="max-w-prose text-body text-text-primary">{movie.overview}</p>
            </section>
          ) : null}

          <RatingPanel rating={entry?.rating ?? null} />

          {entry?.review ? (
            <section className="flex flex-col gap-2 rounded-glass border border-glass-border bg-bg-2 p-4">
              <h2 className="text-label font-medium text-text-secondary">Your review</h2>
              <p className="whitespace-pre-wrap text-body text-text-primary">{entry.review}</p>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-label font-medium text-text-secondary">Cast</h2>
            <CastRow cast={movie.cast} />
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-4 rounded-glass border border-glass-border bg-bg-2 p-4">
            <span className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-glass-sm bg-surface-strong">
              <Poster
                title={movie.title}
                posterPath={movie.poster_path}
                size="w342"
                sizes="72px"
              />
            </span>

            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-display text-card font-medium">
                {entry ? "Your entry" : "Log this film"}
              </h2>
              <p className="text-meta text-text-muted">
                {entry
                  ? `Added ${formatDate(entry.created_at.slice(0, 10)) ?? "recently"}`
                  : "Private to you."}
              </p>
            </div>
          </div>

          <div className="rounded-glass border border-glass-border bg-bg-2 p-4">
            <WatchedEntryForm
              movieId={movie.tmdb_id}
              entry={entry}
              saveAction={saveWatchedEntry}
              removeAction={removeWatchedEntry}
            />
          </div>
        </aside>
      </div>
    </article>
  );
}
