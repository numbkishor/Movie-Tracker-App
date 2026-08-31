import Link from "next/link";

import { MediaBadge } from "@/components/ui/media-badge";
import { Poster } from "@/components/ui/poster";
import { titleHref } from "@/lib/routes";
import type { TitleSummary } from "@/lib/tmdb-types";

/**
 * TMDB's "similar" lookup, and labelled as exactly that.
 *
 * docs/prd.md is explicit that this is not a recommendation engine and must not
 * be presented as one — no "picked for you", no claim that it learned anything
 * about the viewer. Both the heading and the line under it say where the list
 * came from, which is why `caption` is required rather than optional.
 */
export function SimilarTitles({
  heading,
  caption,
  titles,
  showMediaBadge = false,
}: {
  heading: string;
  caption: string;
  titles: TitleSummary[];
  showMediaBadge?: boolean;
}) {
  if (titles.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-card font-medium">{heading}</h2>
        <p className="text-meta text-text-muted">{caption}</p>
      </div>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {titles.map((title) => (
          <li key={`${title.media_type}-${title.tmdb_id}`}>
            <Link
              href={titleHref(title.media_type, title.tmdb_id)}
              className="group flex flex-col gap-1.5"
            >
              <span className="relative block aspect-2/3 overflow-hidden rounded-glass-sm border border-glass-border bg-surface-strong">
                <Poster
                  title={title.title}
                  posterPath={title.poster_path}
                  size="w342"
                  sizes="(max-width: 640px) 30vw, 160px"
                  className="transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </span>

              {showMediaBadge ? <MediaBadge mediaType={title.media_type} /> : null}

              <span className="truncate text-meta text-text-secondary">
                {title.title}
                {title.release_year ? ` · ${title.release_year}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
