import { useSyncExternalStore } from "react";

/** Whether the window matches the media query, kept up to date as the window changes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The width from which screens show a side column instead of stacking, matching Tailwind's `md` breakpoint. */
export const wideScreenQuery = "(min-width: 48rem)";
