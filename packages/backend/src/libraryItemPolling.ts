/** How often a library item being prepared for publishing is fetched again. */
export const libraryPollMs = 2000;

/**
 * Calls `refetch` every `libraryPollMs` while `isProcessing` says the cached item is being prepared, until `removed` settles,
 * as it does once the cache drops the item's entry.
 */
export async function pollWhileProcessing(
  isProcessing: () => boolean,
  refetch: () => void,
  removed: Promise<unknown>,
): Promise<void> {
  let isRemoved = false;
  removed.then(
    () => {
      isRemoved = true;
    },
    () => {
      isRemoved = true;
    },
  );
  for (;;) {
    await Promise.race([delay(libraryPollMs), removed]);
    if (isRemoved) return;
    if (isProcessing()) refetch();
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
