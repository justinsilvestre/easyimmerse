import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { SaveQueue } from "./saveQueue.ts";
import { TimeLimitError } from "./withTimeLimit.ts";

/**
 * Remembers the flashcards whose save timed out, so that whether it landed is unknown,
 * until any later work on the flashcard succeeds through `queue`, be it a save, a retiming, an Undo or a deletion.
 * What a flashcard held before its first timed-out save is kept, so that discarding its card can take the save back.
 */
export function createTimedOutSaves(queue: SaveQueue) {
  /** What each flashcard held before its first timed-out save: a draft, or null for a new card. */
  const beforeById = new Map<string, FlashcardDraft | null>();
  queue.onSuccess((flashcardId) => beforeById.delete(flashcardId));
  return {
    /** Notes how a save of the flashcard with `before` as its earlier content turns out. */
    watch: (
      flashcardId: string,
      before: FlashcardDraft | null,
      saving: Promise<Flashcard>,
    ) =>
      saving.catch((error: unknown) => {
        if (error instanceof TimeLimitError && !beforeById.has(flashcardId))
          beforeById.set(flashcardId, before);
        throw error;
      }),
    /**
     * Forgets a flashcard's timed-out save and returns what the flashcard held before it,
     * or undefined when no save of it is in doubt.
     */
    take(flashcardId: string): FlashcardDraft | null | undefined {
      const before = beforeById.get(flashcardId);
      beforeById.delete(flashcardId);
      return before;
    },
  };
}

export type TimedOutSaves = ReturnType<typeof createTimedOutSaves>;
