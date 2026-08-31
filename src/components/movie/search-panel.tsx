"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { Poster } from "@/components/ui/poster";
import type { MovieSummary } from "@/lib/tmdb-types";

const DEBOUNCE_MS = 300;

/** What the last settled request produced, and which query it was for. */
type Outcome = { query: string; results: MovieSummary[]; error: string | null };

/**
 * Search-as-you-type against /api/tmdb/search. This is one of the few genuinely
 * live cases .cursorrules allows a client fetch for — the results have to track
 * keystrokes, so there is nothing for a Server Component to render up front.
 */
export function SearchPanel({ watchedMovieIds }: { watchedMovieIds: number[] }) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const inputId = useId();

  // Tracks the in-flight request so a slow early response can't overwrite the
  // results of a later, faster one.
  const requestRef = useRef(0);
  const trimmed = query.trim();

  // Everything below is derived from the query and the last settled outcome, so
  // nothing has to be reset in an effect when the query changes.
  const settled = outcome?.query === trimmed ? outcome : null;
  const isSearching = trimmed.length > 0 && settled === null;
  const results = settled?.results ?? [];
  const alreadyWatched = new Set(watchedMovieIds);

  useEffect(() => {
    const search = query.trim();
    if (search.length === 0) return;

    const controller = new AbortController();
    const requestId = ++requestRef.current;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });

        const body: unknown = await response.json();
        if (requestId !== requestRef.current) return;

        setOutcome({
          query: search,
          results: response.ok ? readResults(body) : [],
          error: response.ok ? null : (readError(body) ?? "Search failed. Try again in a moment."),
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestRef.current) return;

        console.error(error);
        setOutcome({
          query: search,
          results: [],
          error: "Could not reach the server. Check your connection.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-5">
      <Field label="Film title" htmlFor={inputId} hint="Results come from TMDB as you type.">
        <Input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a film…"
          autoComplete="off"
          maxLength={120}
        />
      </Field>

      <div aria-live="polite" className="min-h-5 text-label text-text-muted">
        {isSearching ? "Searching…" : null}
        {settled?.error ? <span className="text-red-500">{settled.error}</span> : null}
        {settled && !settled.error && results.length === 0 ? "No films matched that." : null}
      </div>

      <ul className="flex flex-col gap-2">
        {results.map((movie) => (
          <li key={movie.tmdb_id}>
            <ResultRow movie={movie} isWatched={alreadyWatched.has(movie.tmdb_id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultRow({ movie, isWatched }: { movie: MovieSummary; isWatched: boolean }) {
  return (
    <Link
      href={`/movie/${movie.tmdb_id}`}
      className="flex items-center gap-3 rounded-glass border border-glass-border bg-bg-2 p-2.5 transition-colors hover:bg-surface"
    >
      <span className="relative h-[72px] w-12 shrink-0 overflow-hidden rounded-glass-sm bg-surface-strong">
        <Poster title={movie.title} posterPath={movie.poster_path} size="w154" sizes="48px" />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-card-sm font-medium text-text-primary">
          {movie.title}
        </span>
        {/* Release year is shown prominently so reissues and re-releases are
            distinguishable — architecture.md flags this as a known sharp edge. */}
        <span className="text-meta text-text-muted">
          {movie.release_year ?? "Year unknown"}
          {isWatched ? " · already on your list" : ""}
        </span>
      </span>
    </Link>
  );
}

function readResults(body: unknown): MovieSummary[] {
  if (typeof body !== "object" || body === null) return [];

  const results = (body as { results?: unknown }).results;
  return Array.isArray(results) ? (results as MovieSummary[]) : [];
}

function readError(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const error = (body as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}
