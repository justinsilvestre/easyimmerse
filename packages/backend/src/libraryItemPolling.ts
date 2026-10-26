import type { LibraryItem } from "@easyimmerse/types";

/** How often a library item being prepared for publishing is fetched again. */
export const libraryPollMs = 2000;

/** The parts of a library item fetch's lifecycle that following it reads. */
export type LibraryItemFetch = {
  getCacheEntry: () => { data?: LibraryItem; fulfilledTimeStamp?: number };
  queryFulfilled: Promise<{ data: LibraryItem }>;
};

/**
 * Follows one fetch of a library item, a cache update included. While the item is being prepared for publishing,
 * it calls `refetch` after `libraryPollMs`, unless a newer fetch has answered meanwhile or the cache has dropped the item;
 * that fetch is then followed in turn. Polling stops once the item is no longer being prepared or a fetch fails.
 * When the preparation has just ended, it calls `finished`.
 */
export async function followLibraryItemFetch(
  { getCacheEntry, queryFulfilled }: LibraryItemFetch,
  refetch: () => void,
  finished: () => void,
): Promise<void> {
  const wasProcessing = isProcessing(getCacheEntry().data);
  const result = await queryFulfilled.catch(() => null);
  if (result === null) return;
  if (!isProcessing(result.data)) {
    if (wasProcessing) finished();
    return;
  }
  const fetchedAt = getCacheEntry().fulfilledTimeStamp;
  await new Promise((resolve) => setTimeout(resolve, libraryPollMs));
  const entry = getCacheEntry();
  if (entry.data !== undefined && entry.fulfilledTimeStamp === fetchedAt)
    refetch();
}

function isProcessing(item: LibraryItem | undefined): boolean {
  return item?.status.kind === "processing";
}
