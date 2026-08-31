"use client";

import { useSyncExternalStore } from "react";

import { applyTheme, readServerTheme, readTheme, subscribeToTheme } from "@/lib/theme";

export function ThemeToggle() {
  // Reads the attribute ThemeScript already set, so there is no flash and no
  // state to reconcile in an effect. React swaps the server snapshot for the
  // real one right after hydration.
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readServerTheme);
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => applyTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLight}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-surface text-text-secondary transition-colors hover:bg-surface-strong hover:text-text-primary"
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
        {isLight ? (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
