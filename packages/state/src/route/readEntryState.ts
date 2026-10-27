import type { EntryState } from "./routeEffect.ts";

/** Reads what the app kept with a history entry from the state the history holds for it, or returns null for an entry the app did not write. */
export function readEntryState(state: unknown): EntryState | null {
  if (typeof state !== "object" || state === null) return null;
  const { previousPath, origin, scrollTarget } = state as Partial<
    Record<keyof EntryState, unknown>
  >;
  if (previousPath !== null && typeof previousPath !== "string") return null;
  if (origin !== "link" && origin !== "app") return null;
  return scrollTarget === "mediaConversion"
    ? { previousPath, origin, scrollTarget }
    : { previousPath, origin };
}
