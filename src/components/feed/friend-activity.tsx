import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { MediaBadge } from "@/components/ui/media-badge";
import { Poster } from "@/components/ui/poster";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";
import { titleHref } from "@/lib/routes";
import type { FriendActivity as FriendActivityItem } from "@/lib/friends";

/**
 * What friends have chosen to share, newest first. Empty until someone both
 * accepts you and marks an entry shared — which is the intended default, not a
 * gap to fill with suggestions.
 */
export function FriendActivity({ activity }: { activity: FriendActivityItem[] }) {
  if (activity.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-card font-medium">From your friends</h2>
        <Link href="/friends" className="text-meta text-text-muted hover:text-text-secondary">
          Manage friends
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activity.map(({ friend, entry }) => (
          <li key={entry.id}>
            <Link
              href={titleHref(entry.title.media_type, entry.title.tmdb_id)}
              className="flex gap-3 rounded-glass border border-glass-border bg-bg-2 p-3 transition-colors hover:bg-surface"
            >
              <span className="relative h-[84px] w-14 shrink-0 overflow-hidden rounded-glass-sm bg-surface-strong">
                <Poster
                  title={entry.title.title}
                  posterPath={entry.title.poster_path}
                  size="w185"
                  sizes="56px"
                />
              </span>

              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <Avatar name={friend.display_name} src={friend.avatar_url} size={18} />
                  <span className="truncate text-meta text-text-muted">{friend.display_name}</span>
                </span>

                <span className="truncate font-display text-card-sm font-medium text-text-primary">
                  {entry.title.title}
                </span>

                {entry.rating !== null ? <RatingStars rating={entry.rating} size={11} /> : null}

                <span className="flex items-center gap-1.5">
                  <MediaBadge mediaType={entry.title.media_type} />
                  <span className="truncate text-meta text-text-muted">
                    {formatDate(entry.watched_on)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
