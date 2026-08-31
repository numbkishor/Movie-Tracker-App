import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Applies the saved theme before first paint. Without this the page renders in
 * the default (dark) palette and then snaps to light — the flash is worse than
 * the cost of one tiny blocking script.
 *
 * Not user input: a fixed string with the storage key interpolated from a
 * module constant.
 */
const script = `
(function () {
  try {
    var saved = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    var theme = saved === "light" || saved === "dark" ? saved : (prefersLight ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
