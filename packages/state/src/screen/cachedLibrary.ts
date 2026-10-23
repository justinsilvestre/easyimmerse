import type { LibraryText } from "@easyimmerse/types";
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

/** Returns the cached text of a library item, or null while the cache lacks it. */
export function cachedLibraryText(
  backend: ServerCacheSlice,
  itemId: string,
): LibraryText | null {
  return cacheEntry(backend, "getLibraryText", itemId)?.data ?? null;
}
