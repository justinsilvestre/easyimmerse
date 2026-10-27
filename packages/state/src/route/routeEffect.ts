import type { SettingsSection } from "./route.ts";
import type { RouteOrigin } from "./routeHistory.ts";

/** How the address bar takes a new address: as a new entry of the browser's history, or in place of the current entry. */
export type LocationWrite = "push" | "replace";

/** What the app keeps with each history entry it writes, which the platform hands back whenever the history shows that entry again. */
export type EntryState = {
  /** The path of the entry before this one when the app wrote it, or null. */
  previousPath: string | null;
  /** Whether the entry's screen was opened from a link or by the app's own navigation. */
  origin: RouteOrigin;
  /** The section of the general settings to bring into view, which the path leaves out. */
  scrollTarget?: SettingsSection;
};

/** An entry of the history as the app writes it: its path and query, and what the app keeps with it. */
export type LocationEntry = { path: string; state: EntryState };

/**
 * What changed the location: one of the app's own writes, or a move through the history,
 * which is the location the app opened at, or the browser's Back, Forward or a return the app asked for.
 */
export type LocationCause = "write" | "traversal";

/** A location the platform reports: its path and query, what the app kept with its entry if it wrote it, and what changed it. */
export type LocationReport = {
  path: string;
  state: EntryState | null;
  cause: LocationCause;
};

/** What the app asks of the history: to show where the app goes next, or to return to the previous entry, as the browser's Back does. */
export type RouteEffect =
  | { type: "writeLocation"; entry: LocationEntry; write: LocationWrite }
  | { type: "returnToPreviousLocation" };
