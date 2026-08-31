import { classNames } from "@/lib/format";

/**
 * Marks a row or card as a film or a series. Neutral, not a third accent — the
 * distinction is information, not emphasis.
 */
export function MediaBadge({ mediaType, className }: { mediaType: string; className?: string }) {
  const isSeries = mediaType === "tv";

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full border border-glass-border px-1.5 py-0.5 text-meta text-text-secondary",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        {isSeries ? (
          <>
            <rect x="2.5" y="7" width="19" height="13" rx="2" />
            <path d="m8 3 4 4 4-4" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 4v16M17 4v16" />
          </>
        )}
      </svg>
      {isSeries ? "Series" : "Film"}
    </span>
  );
}
