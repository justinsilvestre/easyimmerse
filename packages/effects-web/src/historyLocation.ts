import type { Effects } from "@easyimmerse/state";

/** The parts of a page that the app's address goes through. */
type HistoryPage = Pick<
  Window,
  "location" | "history" | "addEventListener" | "removeEventListener"
>;

/**
 * Builds the effects that keep the page's address in step with where the app is, through the History API:
 * they write each new address as a history entry or in place of the current one,
 * and report the address at once and again after each move of the browser's Back or Forward.
 */
export function createHistoryLocation(
  page: HistoryPage,
): Pick<Effects, "writeLocation" | "subscribeToLocation"> {
  return {
    writeLocation: (path, write) =>
      write === "push"
        ? page.history.pushState(null, "", path)
        : page.history.replaceState(null, "", path),
    subscribeToLocation: (listener) => {
      const report = () =>
        listener(`${page.location.pathname}${page.location.search}`);
      report();
      page.addEventListener("popstate", report);
      return () => page.removeEventListener("popstate", report);
    },
  };
}
