import type {
  AnkiConnectSync,
  AnkiUpdatesQueue,
  FlashcardSync,
} from "@easyimmerse/state";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";

/** AnkiConnect off for the project, with Anki connected at the last check. */
const ankiConnectOff: AnkiConnectSync = {
  isOn: false,
  connection: "connected",
  deniedOrigin: null,
  pendingDeletionCount: 0,
  isSyncing: false,
  hasSyncFailed: false,
};

/** A project of twelve flashcards never exported, with AnkiConnect off, for stories. */
export const neverExportedSync: FlashcardSync = {
  flashcardCount: 12,
  queue: {
    newCount: 12,
    changedCount: 0,
    hasBeenSent: false,
    hasBeenExported: false,
  },
  package: {
    deletions: [],
    ankiSearch: "",
  },
  ankiConnect: ankiConnectOff,
  nextCard: exampleFlashcard,
};

/** A project exported before, with five new and two changed flashcards since, and AnkiConnect off, for stories. */
export const exportedSync: FlashcardSync = {
  ...neverExportedSync,
  queue: {
    newCount: 5,
    changedCount: 2,
    hasBeenSent: false,
    hasBeenExported: true,
  },
};

/** A project exported before, with three deleted flashcards whose notes may still be in Anki, and AnkiConnect off, for stories. */
export const deletionsListedSync: FlashcardSync = {
  ...exportedSync,
  package: {
    ...exportedSync.package,
    deletions: ["fressen", "Tür", "laufen"].map((word, index) => ({
      flashcard_id: `f${index}`,
      word,
      requested_at_ms: index,
    })),
    ankiSearch:
      '"easyImmerse id:f0" OR "easyImmerse id:f1" OR "easyImmerse id:f2"',
  },
};

/** A project using AnkiConnect with three new flashcards in the Anki updates queue, as the given changes leave it, for stories. */
export function ankiConnectSync(
  changes: Partial<AnkiConnectSync> = {},
  queueChanges: Partial<AnkiUpdatesQueue> = {},
): FlashcardSync {
  return {
    ...neverExportedSync,
    queue: {
      newCount: 3,
      changedCount: 0,
      hasBeenSent: true,
      hasBeenExported: false,
      ...queueChanges,
    },
    ankiConnect: { ...ankiConnectOff, isOn: true, ...changes },
  };
}

/**
 * A project with AnkiConnect turned off after it sent flashcards, with three new flashcards in the Anki updates queue
 * and one deleted flashcard whose note may still be in Anki, for stories.
 */
export const ankiConnectOffAfterSendingSync: FlashcardSync = {
  ...ankiConnectSync({ isOn: false, pendingDeletionCount: 1 }),
  package: {
    deletions: [{ flashcard_id: "f0", word: "fressen", requested_at_ms: 0 }],
    ankiSearch: '"easyImmerse id:f0"',
  },
};
