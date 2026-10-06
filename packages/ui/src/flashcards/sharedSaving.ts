import { createSaveQueue } from "./saveQueue.ts";
import { createSavesInDoubt } from "./savesInDoubt.ts";
import { createUnsavedCardStore } from "./unsaved/unsavedCardStore.ts";

/**
 * The parts of flashcard saving that the whole app shares, so that they outlive the media screens that send saves:
 * the one queue that orders all work on each flashcard, the list of cards that could not be saved,
 * the record of saves in doubt, and the notice offering Undo of each flashcard's latest save, by flashcard id.
 */
export function createSharedSaving() {
  const queue = createSaveQueue();
  return {
    queue,
    unsavedCards: createUnsavedCardStore(),
    savesInDoubt: createSavesInDoubt(queue),
    undoNotices: new Map<string, number>(),
  };
}

export type SharedSaving = ReturnType<typeof createSharedSaving>;
