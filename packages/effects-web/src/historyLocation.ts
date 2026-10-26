import type { Effects } from "@easyimmerse/state";

/** The parts of a page that the app's address goes through. */
type HistoryPage = Pick<
  Window,
  "location" | "history" | "addEventListener" | "removeEventListener"
>;

/** What the app keeps in `history.state` with each entry it writes. */
type EntryState = { previousPath: string | null };

/**
 * Builds the effects that keep the page's address in step with where the app is, through the History API.
 * They write each new address as a history entry or in place of the current one, keeping the previous entry's path in the entry's state,
 * which survives reloads, and report the entry at once and again after each move of the browser's Back or Forward.
 */
export function createHistoryLocation(
  page: HistoryPage,
): Pick<
  Effects,
  "writeLocation" | "returnToPreviousLocation" | "subscribeToLocation"
> {
  return {
    writeLocation: ({ path, previousPath }, write) => {
      const state: EntryState = { previousPath };
      if (write === "push") page.history.pushState(state, "", path);
      else page.history.replaceState(state, "", path);
    },
    returnToPreviousLocation: () => page.history.back(),
    subscribeToLocation: (listener) => {
      const report = () =>
        listener({
          path: `${page.location.pathname}${page.location.search}`,
          previousPath: previousPathIn(page.history.state),
        });
      report();
      page.addEventListener("popstate", report);
      return () => page.removeEventListener("popstate", report);
    },
  };
}

/** Reads the previous path the app kept in an entry's state, or null for an entry it did not write. */
function previousPathIn(state: unknown): string | null {
  const previousPath = (state as Partial<EntryState> | null)?.previousPath;
  return typeof previousPath === "string" ? previousPath : null;
}
