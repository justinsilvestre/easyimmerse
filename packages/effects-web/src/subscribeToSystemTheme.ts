import type { Theme } from "@easyimmerse/state";

/**
 * Builds a subscription to the operating system's theme, read from a `prefers-color-scheme: dark` media query.
 * It calls the listener at once and again whenever the theme changes, and returns a function that stops the calls.
 */
export function createSubscribeToSystemTheme(
  darkQuery: MediaQueryList,
): (listener: (theme: Theme) => void) => () => void {
  return (listener) => {
    const report = () => listener(darkQuery.matches ? "dark" : "light");
    report();
    darkQuery.addEventListener("change", report);
    return () => darkQuery.removeEventListener("change", report);
  };
}
