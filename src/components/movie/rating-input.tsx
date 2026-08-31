"use client";

import { useState } from "react";

import { classNames, formatRating } from "@/lib/format";

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/**
 * Half-step picker. Rendered as real radio inputs so it is keyboard- and
 * screen-reader-navigable and submits with the form without any JS glue; the
 * stars are the visual layer over that.
 */
export function RatingInput({ name, defaultValue }: { name: string; defaultValue: number | null }) {
  const [value, setValue] = useState<number | null>(defaultValue);
  const [hovered, setHovered] = useState<number | null>(null);

  const shown = hovered ?? value;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-3"
        onMouseLeave={() => setHovered(null)}
      >
        <fieldset className="flex items-center">
          <legend className="sr-only">Your rating, in half stars</legend>

          {STEPS.map((step, index) => (
            <label
              key={step}
              onMouseEnter={() => setHovered(step)}
              className={classNames(
                // Each star is two half-width labels sitting flush together; the
                // gap goes between star pairs, never inside one.
                "relative h-8 w-4 cursor-pointer",
                step % 1 === 0.5 && index > 0 ? "ml-1" : "",
              )}
            >
              <input
                type="radio"
                name={name}
                value={step}
                checked={value === step}
                onChange={() => setValue(step)}
                className="peer sr-only"
              />
              <span className="sr-only">{formatRating(step)} stars</span>
              <HalfStar
                side={step % 1 === 0.5 ? "left" : "right"}
                filled={shown !== null && shown >= step}
              />
            </label>
          ))}
        </fieldset>

        <span className="text-label text-text-secondary">
          {shown === null ? "No rating" : `${formatRating(shown)} / 5`}
        </span>

        {value !== null ? (
          <button
            type="button"
            onClick={() => setValue(null)}
            className="text-meta text-text-muted underline-offset-2 hover:text-text-secondary hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Keeps the field present in the submitted form when nothing is selected,
          so clearing a rating actually clears it rather than leaving the old one. */}
      {value === null ? <input type="hidden" name={name} value="" /> : null}
    </div>
  );
}

const STAR_PATH =
  "M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 16.6 6.4 19.8l1.3-6.3L3 9.2l6.3-.7z";

function HalfStar({ side, filled }: { side: "left" | "right"; filled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={classNames(
        "pointer-events-none absolute inset-y-0 flex w-8 items-center text-accent",
        side === "left" ? "left-0 justify-start" : "right-0 justify-end",
      )}
      style={{ clipPath: side === "left" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)" }}
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" aria-hidden="true">
        <path
          d={STAR_PATH}
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
          opacity={filled ? 1 : 0.34}
        />
      </svg>
    </span>
  );
}
