import type {
  AnkiConnectSync,
  AnkiUpdatesQueue,
  FlashcardSync,
} from "@easyimmerse/state";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";

/** A project of twelve flashcards never exported, with AnkiConnect off, for stories. */
export const neverExportedSync: FlashcardSync = {
  flashcardCount: 12,
  queue: { newCount: 12, changedCount: 0, hasBeenFlushed: false },
  package: {
    deletions: [],
    ankiSearch: "",
    markCount: 0,
  },
  ankiConnect: null,
  nextCard: exampleFlashcard,
};

/** A project exported before, with five new and two changed flashcards since, and AnkiConnect off, for stories. */
export const exportedSync: FlashcardSync = {
  ...neverExportedSync,
  queue: { newCount: 5, changedCount: 2, hasBeenFlushed: true },
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
      reached_by_package: true,
      reached_by_anki_connect: false,
    })),
    ankiSearch:
      '"easyImmerse id:f0" OR "easyImmerse id:f1" OR "easyImmerse id:f2"',
    markCount: 3,
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
      hasBeenFlushed: true,
      ...queueChanges,
    },
    ankiConnect: {
      connection: "connected",
      deniedOrigin: null,
      pendingDeletionCount: 0,
      isSyncing: false,
      ...changes,
    },
  };
}
