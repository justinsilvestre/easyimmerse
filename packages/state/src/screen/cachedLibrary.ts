import type { LibraryText } from "@easyimmerse/types";
import { canManageLibrary } from "../account/canManageLibrary.ts";
import { cacheEntry, type ServerCacheSlice } from "../server/cacheEntry.ts";

/** Returns the library item a media file comes from, or null for a media file of any other source or one the cache lacks. */
export function cachedLibraryItemIdOf(
  backend: ServerCacheSlice,
  projectId: string,
  mediaFileId: string,
): string | null {
  const files = cacheEntry(backend, "listMediaFiles", projectId)?.data;
  const source = files?.media_files.find(
    ({ id }) => id === mediaFileId,
  )?.source;
  return source?.kind === "library" ? source.item_id : null;
}

/**
 * Tells whether a media file plays the tracks its library manager chose, so that nobody may choose others here:
 * a file from the library, unless the app's principal is preparing its item, as `isCachedLibraryItemInPreparation` describes.
 */
export function isCachedLibraryFileLocked(
  backend: ServerCacheSlice,
  projectId: string,
  mediaFileId: string,
): boolean {
  const itemId = cachedLibraryItemIdOf(backend, projectId, mediaFileId);
  return itemId !== null && !isCachedLibraryItemInPreparation(backend, itemId);
}

/**
 * Tells whether the app's principal is preparing a library item: one who manages the library, while the item is a draft or failed to publish.
 * It is false while the cache lacks the principal or the item.
 */
export function isCachedLibraryItemInPreparation(
  backend: ServerCacheSlice,
  itemId: string,
): boolean {
  const principal = cacheEntry(backend, "getCurrentPrincipal", "self")?.data;
  const status = cacheEntry(backend, "getLibraryItem", itemId)?.data?.status;
  return (
    canManageLibrary(principal) &&
    (status?.kind === "draft" || status?.kind === "failed")
  );
}

/** Tells whether the cache holds a library item as published, which learners can make flashcards from. */
export function isCachedLibraryItemPublished(
  backend: ServerCacheSlice,
  itemId: string,
): boolean {
  const item = cacheEntry(backend, "getLibraryItem", itemId)?.data;
  return item?.status.kind === "published";
}

/** Returns the cached text of a library item, or null while the cache lacks it. */
export function cachedLibraryText(
  backend: ServerCacheSlice,
  itemId: string,
): LibraryText | null {
  return cacheEntry(backend, "getLibraryText", itemId)?.data ?? null;
}
