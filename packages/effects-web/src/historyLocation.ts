import type { Effects, LocationReport } from "@easyimmerse/state";
import { readEntryState } from "@easyimmerse/state";
import type { HistoryLocation, RouterHistory } from "@tanstack/history";

/**
 * Builds the effects that keep where the app is in a history: the browser's, or one kept in memory.
 * They write each new entry with the state the app keeps with it, return to the previous entry,
 * and report the location at once and after every change the history notifies: the app's own writes, and every move through it.
 */
export function createHistoryLocation(
  history: RouterHistory,
): Pick<
  Effects,
  "writeLocation" | "returnToPreviousLocation" | "subscribeToLocation"
> {
  return {
    writeLocation: ({ path, state }, write) =>
      write === "push"
        ? history.push(path, state)
        : history.replace(path, state),
    returnToPreviousLocation: () => history.back(),
    subscribeToLocation: (listener) => {
      listener(reportOf(history.location, "traversal"));
      return history.subscribe(({ location, action }) =>
        listener(
          reportOf(
            location,
            action.type === "PUSH" || action.type === "REPLACE"
              ? "write"
              : "traversal",
          ),
        ),
      );
    },
  };
}

function reportOf(
  location: HistoryLocation,
  cause: LocationReport["cause"],
): LocationReport {
  return {
    path: `${location.pathname}${location.search}`,
    state: readEntryState(location.state),
    cause,
  };
}
