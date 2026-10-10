import { createSaveQueue } from "./saveQueue.ts";
import { createSavesInDoubt } from "./savesInDoubt.ts";
import { createUnsavedCardStore } from "./unsaved/unsavedCardStore.ts";

/**
 * The parts of flashcard saving that the whole app shares, so that they outlive the media screens that send saves:
 * the one queue that orders all work on each flashcard, the list of cards that could not be saved,
 * and the record of saves in doubt.
 */
export function createSharedSaving() {
  const queue = createSaveQueue();
  return {
    queue,
    unsavedCards: createUnsavedCardStore(),
    savesInDoubt: createSavesInDoubt(queue),
  };
}

export type SharedSaving = ReturnType<typeof createSharedSaving>;
