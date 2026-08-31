import { classNames, formatRating } from "@/lib/format";

/**
 * Gold, always — design.md reserves the accent for anything rating-related.
 * Read-only; the interactive picker lives with the entry form.
 */
export function RatingStars({
  rating,
  size = 14,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const label = `${formatRating(rating)} out of 5`;

  return (
    <span
      className={classNames("inline-flex items-center gap-0.5 text-accent", className)}
      role="img"
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((position) => (
        <Star key={position} fill={fillFor(rating, position)} size={size} />
      ))}
    </span>
  );
}

function fillFor(rating: number, position: number): "full" | "half" | "empty" {
  if (rating >= position) return "full";
  if (rating >= position - 0.5) return "half";
  return "empty";
}

const STAR_PATH =
  "M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 16.6 6.4 19.8l1.3-6.3L3 9.2l6.3-.7z";

function Star({ fill, size }: { fill: "full" | "half" | "empty"; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0">
      <path
        d={STAR_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity={fill === "empty" ? 0.32 : 1}
      />
      {/* A clipped overlay rather than an SVG gradient: a gradient needs an id,
          and repeating one id per star on the page is invalid markup. */}
      {fill !== "empty" ? (
        <path
          d={STAR_PATH}
          fill="currentColor"
          style={fill === "half" ? { clipPath: "inset(0 50% 0 0)" } : undefined}
        />
      ) : null}
    </svg>
  );
}
