import Link from "next/link";

import { MediaBadge } from "@/components/ui/media-badge";
import { Poster } from "@/components/ui/poster";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatYear } from "@/lib/format";
import { titleHref } from "@/lib/routes";
import type { MovieRow } from "@/lib/supabase/database.types";

type GridEntry = {
  id: string;
  rating?: number | null;
  title: MovieRow;
};

/**
 * An even poster grid. Used wherever a list is a list rather than a feed — a
 * friend's shared entries, the watchlist — so the bento grid stays reserved for
 * your own home feed, where card size actually carries meaning.
 */
export function TitleGrid({ entries }: { entries: GridEntry[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            href={titleHref(entry.title.media_type, entry.title.tmdb_id)}
            className="group flex flex-col gap-1.5"
          >
            <span className="relative block aspect-2/3 overflow-hidden rounded-glass-sm border border-glass-border bg-surface-strong">
              <Poster
                title={entry.title.title}
                posterPath={entry.title.poster_path}
                size="w342"
                sizes="(max-width: 640px) 30vw, 160px"
                className="transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </span>

            <MediaBadge mediaType={entry.title.media_type} />

            <span className="truncate text-meta text-text-secondary">
              {entry.title.title}
              {formatYear(entry.title.release_date) ? ` · ${formatYear(entry.title.release_date)}` : ""}
            </span>

            {entry.rating != null ? <RatingStars rating={entry.rating} size={11} /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
