import type { AnkiConnectSync, FlashcardSync } from "@easyimmerse/state";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";

/** A project of twelve flashcards never exported, with AnkiConnect off, for stories. */
export const neverExportedSync: FlashcardSync = {
  flashcardCount: 12,
  package: { sinceLastExport: null },
  ankiConnect: null,
  nextCard: exampleFlashcard,
};

/** A project exported before, with five new and two changed flashcards since, and AnkiConnect off, for stories. */
export const exportedSync: FlashcardSync = {
  ...neverExportedSync,
  package: { sinceLastExport: { newCount: 5, changedCount: 2 } },
};

/** A project using AnkiConnect with three new flashcards waiting to be sent, as the given changes leave it, for stories. */
export function ankiConnectSync(
  changes: Partial<AnkiConnectSync> = {},
): FlashcardSync {
  return {
    ...neverExportedSync,
    ankiConnect: {
      connection: "connected",
      deniedOrigin: null,
      unsentCount: 3,
      changedCount: 0,
      pendingDeletionCount: 0,
      isSyncing: false,
      ...changes,
    },
  };
}
