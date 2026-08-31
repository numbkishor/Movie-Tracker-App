export const THEME_STORAGE_KEY = "reelist-theme";

export type Theme = "dark" | "light";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * The theme lives on <html data-theme>, written before first paint by
 * ThemeScript. That attribute — not React state — is the source of truth, so
 * this is a tiny external store the toggle reads through useSyncExternalStore
 * rather than a piece of state to sync in an effect.
 */
const listeners = new Set<() => void>();

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Dark is the default (design.md), and what the server renders against. */
export function readServerTheme(): Theme {
  return "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing can refuse storage. The theme still applies for this
    // session; it just will not be remembered.
  }

  for (const listener of listeners) {
    listener();
  }
}
