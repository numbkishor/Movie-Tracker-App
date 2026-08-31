import { RatingStars } from "@/components/ui/rating-stars";
import { formatRating } from "@/lib/format";

/**
 * Your rating in gold; the IMDb slot deliberately reads "Coming soon" in a muted
 * tone. It is not a number and is not styled like a real rating, because it is
 * not one — no API is wired up for it, by explicit decision (docs/prd.md).
 */
export function RatingPanel({ rating }: { rating: number | null }) {
  return (
    <div className="glass grid grid-cols-2 gap-3 rounded-glass p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-meta text-text-muted">Your rating</span>
        {rating === null ? (
          <span className="text-body text-text-secondary">Not rated yet</span>
        ) : (
          <span className="flex items-baseline gap-2">
            <span className="font-display text-subhead font-medium text-accent">
              {formatRating(rating)}
            </span>
            <RatingStars rating={rating} size={13} />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-l border-glass-border pl-3">
        <span className="text-meta text-text-muted">IMDb rating</span>
        <span className="text-body text-text-muted">Coming soon</span>
      </div>
    </div>
  );
}
