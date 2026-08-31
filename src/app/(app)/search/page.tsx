import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { SearchPanel } from "@/components/movie/search-panel";
import { getSignedInUser } from "@/lib/auth";
import { listWatchedEntries } from "@/lib/titles";

export const metadata: Metadata = { title: "Add a title" };
export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");

  // Loaded here rather than in the client component so the "already on your
  // list" marker is right on first paint, with no extra round trip.
  const entries = await listWatchedEntries(user.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-hero font-bold">Add a title</h1>
        <p className="text-body text-text-secondary">
          Films and series, straight from TMDB.
        </p>
      </header>

      <SearchPanel
        watchedKeys={entries.map((entry) => `${entry.media_type}-${entry.movie_id}`)}
      />
    </div>
  );
}
