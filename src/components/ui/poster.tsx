import Image from "next/image";

import { classNames } from "@/lib/format";
import { tmdbImageUrl, type TmdbImageSize } from "@/lib/tmdb-image";

/** Poster with a typographic fallback for titles TMDB has no artwork for. */
export function Poster({
  title,
  posterPath,
  size = "w342",
  className,
  sizes,
  priority = false,
}: {
  title: string;
  posterPath: string | null;
  size?: TmdbImageSize;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const src = tmdbImageUrl(posterPath, size);

  if (!src) {
    return (
      <div
        // Matches the layout of the <Image fill> branch, so a missing poster
        // occupies the same box rather than collapsing. A glyph rather than the
        // title: every place this appears already prints the title alongside it.
        role="img"
        aria-label={`No poster available for ${title}`}
        className={classNames(
          "absolute inset-0 flex items-center justify-center bg-surface-strong",
          className,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-8 w-8 text-text-muted opacity-60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M7 4v16M17 4v16M3 12h18" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`Poster for ${title}`}
      fill
      sizes={sizes ?? "(max-width: 640px) 45vw, 240px"}
      priority={priority}
      className={classNames("object-cover", className)}
    />
  );
}
