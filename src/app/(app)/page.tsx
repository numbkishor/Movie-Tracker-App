import { redirect } from "next/navigation";

import { BentoFeed } from "@/components/feed/bento-feed";
import { ButtonLink } from "@/components/ui/button";
import { formatRating } from "@/lib/format";
import { requireProfile } from "@/lib/auth";
import { listWatchedEntries, summarizeWatched, type WatchedEntryWithMovie } from "@/lib/watched";

// The list must reflect what the other device just added, so this page is never
// served from a cached render. This is the whole of the "sync" story
// (architecture.md) — same rows, read fresh.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireProfile();
  if (!profile) redirect("/sign-in");

  const entries = await listWatchedEntries(profile.id);
  const stats = summarizeWatched(entries);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-hero font-bold">
            {entries.length === 0 ? "Your list" : `Hello, ${profile.display_name}`}
          </h1>
          <p className="text-body text-text-secondary">
            {entries.length === 0
              ? "Nothing logged yet — private to you until you say otherwise."
              : `${stats.total} ${stats.total === 1 ? "film" : "films"} logged · private to you`}
          </p>
        </div>

        <ButtonLink href="/search">Add a film</ButtonLink>
      </header>

      {entries.length === 0 ? <EmptyState /> : <FeedWithStats entries={entries} />}
    </div>
  );
}

function FeedWithStats({ entries }: { entries: WatchedEntryWithMovie[] }) {
  const stats = summarizeWatched(entries);

  return (
    <div className="flex flex-col gap-6">
      <BentoFeed entries={entries} />

      <section
        aria-label="Your totals"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <Stat label="Films logged" value={String(stats.total)} />
        <Stat label="This year" value={String(stats.thisYear)} />
        <Stat
          label="Average rating"
          value={stats.averageRating === null ? "—" : formatRating(roundToHalf(stats.averageRating)) ?? "—"}
          accent
        />
      </section>
    </div>
  );
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
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
