import Link from "next/link";
import Image from "next/image";

import { Poster } from "@/components/ui/poster";
import { RatingStars } from "@/components/ui/rating-stars";
import { classNames, formatDate, formatRating, formatYear } from "@/lib/format";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import type { WatchedEntryWithMovie } from "@/lib/watched";

/**
 * The bento grid from design.md: a 2×2 hero for the most recent watch, one tall
 * card, then squares. Size tracks importance (recency first), and the column
 * count steps down on narrow viewports rather than the layout being redesigned
 * per breakpoint.
 */
export function BentoFeed({ entries }: { entries: WatchedEntryWithMovie[] }) {
  const [hero, tall, ...rest] = entries;

  if (!hero) return null;

  return (
    <div className="grid auto-rows-[152px] grid-cols-2 gap-3 sm:auto-rows-[168px] sm:grid-cols-3 lg:grid-cols-4">
      <HeroCard entry={hero} />
      {tall ? <TallCard entry={tall} /> : null}
      {rest.map((entry) => (
        <SquareCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function cardHref(entry: WatchedEntryWithMovie): string {
  return `/movie/${entry.movie.tmdb_id}`;
}

const cardShell =
  "group relative overflow-hidden rounded-glass border border-glass-border bg-bg-2 " +
  "transition-transform duration-200 hover:-translate-y-0.5";

/** Glass rating pill, floating over the artwork — the one place glass belongs on a card. */
function RatingPill({ rating, large = false }: { rating: number; large?: boolean }) {
  return (
    <span
      className={classNames(
        "glass absolute right-3 top-3 flex items-center gap-1 rounded-full text-accent",
        large ? "px-3 py-1.5 text-label" : "px-2 py-1 text-meta",
      )}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 16.6 6.4 19.8l1.3-6.3L3 9.2l6.3-.7z" />
      </svg>
      <span className="font-medium">{formatRating(rating)}</span>
    </span>
  );
}

function HeroCard({ entry }: { entry: WatchedEntryWithMovie }) {
  const backdrop = tmdbImageUrl(entry.movie.backdrop_path, "w780");
  const watched = formatDate(entry.watched_on);
  const year = formatYear(entry.movie.release_date);

  return (
    <Link href={cardHref(entry)} className={classNames(cardShell, "col-span-2 row-span-2")}>
      {backdrop ? (
        <Image
          src={backdrop}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <Poster
          title={entry.movie.title}
          posterPath={entry.movie.poster_path}
          size="w780"
          sizes="(max-width: 640px) 100vw, 50vw"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
      )}

      <div className="backdrop-shade absolute inset-0" />

      {entry.rating !== null ? <RatingPill rating={entry.rating} large /> : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-5">
        <p className="text-meta text-text-secondary">
          {watched ? `Watched ${watched}` : "Most recent"}
        </p>
        <h3 className="font-display text-hero font-bold leading-tight text-text-primary">
          {entry.movie.title}
        </h3>
        {year ? <p className="text-label text-text-secondary">{year}</p> : null}
      </div>
    </Link>
  );
}

function TallCard({ entry }: { entry: WatchedEntryWithMovie }) {
  return (
    <Link href={cardHref(entry)} className={classNames(cardShell, "row-span-2")}>
      <Poster
        title={entry.movie.title}
        posterPath={entry.movie.poster_path}
        size="w500"
        sizes="(max-width: 640px) 45vw, 240px"
        className="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="backdrop-shade absolute inset-0" />

      {entry.rating !== null ? <RatingPill rating={entry.rating} /> : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
        <h3 className="font-display text-card font-medium leading-tight text-text-primary">
          {entry.movie.title}
        </h3>
        <p className="text-meta text-text-secondary">{formatDate(entry.watched_on)}</p>
      </div>
    </Link>
  );
}

function SquareCard({ entry }: { entry: WatchedEntryWithMovie }) {
  return (
    <Link href={cardHref(entry)} className={cardShell}>
      <Poster
        title={entry.movie.title}
        posterPath={entry.movie.poster_path}
        size="w342"
        sizes="(max-width: 640px) 45vw, 200px"
        className="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="backdrop-shade absolute inset-0" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
        <h3 className="font-display text-card-sm font-medium leading-tight text-text-primary">
          {entry.movie.title}
        </h3>
        {entry.rating !== null ? <RatingStars rating={entry.rating} size={12} /> : null}
      </div>
    </Link>
  );
}
