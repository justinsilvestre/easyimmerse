/** How the address bar takes a new address: as a new entry of the browser's history, or in place of the current entry. */
export type LocationWrite = "push" | "replace";

/**
 * An entry of the browser's history as the app writes it: its path and query,
 * and the path of the entry before it, when the app wrote that one too in the same tab, or null.
 */
export type LocationEntry = { path: string; previousPath: string | null };

/** What the route asks of the platform: to show where the app now is, or to return to the previous entry of the history, as the browser's Back does. */
export type RouteEffect =
  | { type: "writeLocation"; entry: LocationEntry; write: LocationWrite }
  | { type: "returnToPreviousLocation" };
