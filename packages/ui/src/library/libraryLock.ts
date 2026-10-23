import type { LibraryItemStatus } from "@easyimmerse/types";

/** Why an item's file, subtitles and words cannot change: it is being prepared, or it is published; null while they can. */
export type LibraryLock = "processing" | "published" | null;

/** Returns why an item in a status cannot have its file, subtitles or words changed. */
export function libraryLockOf(status: LibraryItemStatus): LibraryLock {
  return status.kind === "processing" || status.kind === "published"
    ? status.kind
    : null;
}

/** What a locked item asks of the library manager before `change` can be made, such as "change its words". */
export function libraryLockText(
  lock: Exclude<LibraryLock, null>,
  change: string,
) {
  return lock === "processing"
    ? `Wait until the item is prepared, then unpublish it to ${change}.`
    : `Unpublish the item to ${change}.`;
}
