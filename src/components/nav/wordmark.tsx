import Link from "next/link";

/**
 * The reel is drawn rather than imported so it inherits currentColor and works
 * unchanged in both modes.
 */
export function Wordmark({ href }: { href?: string }) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="8" r="2" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="14" r="2" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14" r="2" fill="currentColor" stroke="none" />
      </svg>
      <span className="font-display text-subhead font-bold tracking-tight text-text-primary">
        Reelist
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="rounded-full" aria-label="Reelist home">
      {content}
    </Link>
  );
}
