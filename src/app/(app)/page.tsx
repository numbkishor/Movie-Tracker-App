import { redirect } from "next/navigation";

import { BentoFeed } from "@/components/feed/bento-feed";
import { FriendActivity } from "@/components/feed/friend-activity";
import { SimilarTitles } from "@/components/movie/similar-titles";
import { ButtonLink } from "@/components/ui/button";
import { formatRating } from "@/lib/format";
import { requireProfile } from "@/lib/auth";
import { listFriendActivity } from "@/lib/friends";
import { getSimilarTitles } from "@/lib/tmdb";
import { isMediaType } from "@/lib/tmdb-types";
import { listWatchedEntries, summarizeWatched, type WatchedEntryWithTitle } from "@/lib/titles";

// The list must reflect what the other device just added, so this page is never
// served from a cached render. This is the whole of the "sync" story
// (architecture.md) — same rows, read fresh.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireProfile();
  if (!profile) redirect("/sign-in");

  const [entries, friendActivity] = await Promise.all([
    listWatchedEntries(profile.id),
    listFriendActivity(profile.id),
  ]);

  const stats = summarizeWatched(entries);
  const mostRecent = entries[0];

  // Recommendations key off the most recently added title, per phases.md. A
  // failure here must not take the feed down — it is the least important thing
  // on the page.
  const similar =
    mostRecent && isMediaType(mostRecent.media_type)
      ? await getSimilarTitles(mostRecent.media_type, mostRecent.movie_id, 6).catch(() => [])
      : [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-hero font-bold">
            {entries.length === 0 ? "Your list" : `Hello, ${profile.display_name}`}
          </h1>
          <p className="text-body text-text-secondary">
            {entries.length === 0
              ? "Nothing logged yet — private to you until you share it."
              : `${stats.total} logged · ${stats.films} ${stats.films === 1 ? "film" : "films"}, ${stats.series} ${stats.series === 1 ? "series" : "series"}`}
          </p>
        </div>

        <ButtonLink href="/search">Add a title</ButtonLink>
      </header>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <BentoFeed entries={entries} />
          <StatsRow entries={entries} />
        </>
      )}

      <FriendActivity activity={friendActivity} />

      {mostRecent ? (
        <SimilarTitles
          heading={`More like ${mostRecent.title.title}`}
          caption="TMDB's similar-titles lookup for the last thing you logged. It's a lookup, not a recommendation engine."
          titles={similar}
          showMediaBadge
        />
      ) : null}
    </div>
  );
}

function StatsRow({ entries }: { entries: WatchedEntryWithTitle[] }) {
  const stats = summarizeWatched(entries);

  return (
    <section aria-label="Your totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label="Titles logged" value={String(stats.total)} />
      <Stat label="This year" value={String(stats.thisYear)} />
      <Stat
        label="Average rating"
        value={
          stats.averageRating === null
            ? "—"
            : (formatRating(Math.round(stats.averageRating * 2) / 2) ?? "—")
        }
        accent
      />
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-glass border border-glass-border bg-bg-2 px-4 py-3">
      <span className="text-meta text-text-muted">{label}</span>
      <span
        className={`font-display text-subhead font-medium ${accent ? "text-accent" : "text-text-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-glass-lg border border-dashed border-glass-border px-6 py-16 text-center">
      <h2 className="font-display text-subhead font-medium">Start with the last thing you watched</h2>
      <p className="max-w-sm text-body text-text-secondary">
        Search for it, give it a rating and a few words, and it will be here on every device you sign
        in from.
      </p>
      <ButtonLink href="/search">Search TMDB</ButtonLink>
    </div>
  );
}
