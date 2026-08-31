import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { TitleGrid } from "@/components/feed/title-grid";
import { requireProfile } from "@/lib/auth";
import { listWatchlistEntries } from "@/lib/titles";

export const metadata: Metadata = { title: "Watchlist" };
export const dynamic = "force-dynamic";

/**
 * The watchlist is a list of its own, not a flag on the watched list — a thing
 * you mean to watch and a thing you have watched are different states with
 * different lifetimes. Logging something as watched removes it from here.
 */
export default async function WatchlistPage() {
  const profile = await requireProfile();
  if (!profile) redirect("/sign-in");

  const entries = await listWatchlistEntries(profile.id);
  const sharedCount = entries.filter((entry) => entry.is_public).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-hero font-bold">Watchlist</h1>
          <p className="text-body text-text-secondary">
            {entries.length === 0
              ? "Things you mean to get to."
              : `${entries.length} waiting${sharedCount > 0 ? ` · ${sharedCount} shared with friends` : ""}`}
          </p>
        </div>

        <ButtonLink href="/search">Find something</ButtonLink>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-glass-lg border border-dashed border-glass-border px-6 py-16 text-center">
          <h2 className="font-display text-subhead font-medium">Nothing queued up</h2>
          <p className="max-w-sm text-body text-text-secondary">
            When you find something you want to watch but haven&apos;t yet, add it here instead of
            logging it as watched.
          </p>
          <ButtonLink href="/search">Search TMDB</ButtonLink>
        </div>
      ) : (
        <TitleGrid entries={entries} />
      )}
    </div>
  );
}
