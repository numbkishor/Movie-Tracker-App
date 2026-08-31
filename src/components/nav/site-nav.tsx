import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { Wordmark } from "@/components/nav/wordmark";
import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * design.md: the profile button opens the profile page — it is not a dropdown of
 * unrelated actions.
 */
export function SiteNav({ profile }: { profile: ProfileRow }) {
  return (
    <header className="sticky top-0 z-30 border-b border-glass-border bg-bg/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Wordmark href="/" />

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="flex h-9 items-center gap-2 rounded-full border border-glass-border bg-surface px-3 text-label text-text-secondary transition-colors hover:bg-surface-strong hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <span className="hidden sm:inline">Add a film</span>
          </Link>

          <ThemeToggle />

          <Link
            href="/profile"
            aria-label={`Profile — ${profile.display_name}`}
            className="rounded-full transition-opacity hover:opacity-85"
          >
            <Avatar name={profile.display_name} src={profile.avatar_url} size={36} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
