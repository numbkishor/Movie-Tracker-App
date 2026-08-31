/** Small display helpers shared across screens. Presentation only — no fetching. */

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Formats a Postgres `date` (YYYY-MM-DD) without dragging it through a timezone. */
export function formatDate(value: string | null): string | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;

  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatYear(value: string | null): string | null {
  if (!value) return null;

  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

/** Ratings are stored in half steps: 4 reads as "4", 4.5 as "4.5". */
export function formatRating(rating: number | null): string | null {
  if (rating === null) return null;

  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;

  return `${hours}h ${remaining}m`;
}

/** Today's date as YYYY-MM-DD in the viewer's own timezone. */
export function todayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return (first + second).toUpperCase() || "?";
}

export function classNames(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
