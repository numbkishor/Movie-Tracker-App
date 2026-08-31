"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { classNames, formatDate } from "@/lib/format";
import type { EntryFormState } from "@/app/(app)/title/[media]/[id]/actions";
import type { MediaType, SeasonSummary } from "@/lib/tmdb-types";

function SeasonButton({ watched, label }: { watched: boolean; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={watched}
      aria-label={label}
      className={classNames(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
        watched
          ? "border-accent bg-accent text-on-accent"
          : "border-glass-border text-text-muted hover:border-accent/50 hover:text-text-secondary",
      )}
    >
      {pending ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </button>
  );
}

/**
 * Season-level progress for a series. Seasons are the unit people actually talk
 * about finishing, so episode-level tracking is deliberately still not modelled
 * (docs/architecture.md).
 */
export function SeasonList({
  tmdbId,
  mediaType,
  seasons,
  watchedSeasonNumbers,
  hasEntry,
  action,
}: {
  tmdbId: number;
  mediaType: MediaType;
  seasons: SeasonSummary[];
  watchedSeasonNumbers: number[];
  hasEntry: boolean;
  action: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
}) {
  const router = useRouter();
  const [state, toggle] = useActionState<EntryFormState, FormData>(action, {});
  const watched = new Set(watchedSeasonNumbers);

  useEffect(() => {
    if (state.saved) router.refresh();
  }, [state.saved, router]);

  if (seasons.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-label font-medium text-text-secondary">Seasons</h2>
        <p className="text-meta text-text-muted">
          {hasEntry
            ? `${watched.size} of ${seasons.length} marked watched`
            : "Add the series to your list to track seasons"}
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-meta text-red-500">
          {state.error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {seasons.map((season) => {
          const isWatched = watched.has(season.season_number);
          const meta = [
            season.episode_count ? `${season.episode_count} episodes` : null,
            formatDate(season.air_date),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={season.season_number}
              className="flex items-center gap-3 rounded-glass-sm border border-glass-border bg-bg-2 px-3 py-2"
            >
              <form action={toggle} className="contents">
                <input type="hidden" name="tmdb_id" value={tmdbId} />
                <input type="hidden" name="media_type" value={mediaType} />
                <input type="hidden" name="season_number" value={season.season_number} />

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label font-medium text-text-primary">
                    {season.name}
                  </span>
                  {meta ? <span className="truncate text-meta text-text-muted">{meta}</span> : null}
                </span>

                {hasEntry ? (
                  <SeasonButton
                    watched={isWatched}
                    label={
                      isWatched
                        ? `Mark ${season.name} as not watched`
                        : `Mark ${season.name} as watched`
                    }
                  />
                ) : null}
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
