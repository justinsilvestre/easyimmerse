import type { LibraryItemStatus } from "@easyimmerse/types";

/** Whether an item's file, subtitles and words cannot change for now, as while the server prepares the item for learners. */
export function isLibraryItemLocked(status: LibraryItemStatus): boolean {
  return status.kind === "processing";
}

/** What a locked item, whose title is given, asks of the library manager before `change` can be made, such as "change its words". */
export function libraryLockText(change: string, title: string) {
  return `Wait until the server has prepared “${title}” for learners, then ${change}.`;
}
