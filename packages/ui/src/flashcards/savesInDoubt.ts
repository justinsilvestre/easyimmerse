import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { SaveQueue } from "./saveQueue.ts";
import { TimeLimitError } from "./withTimeLimit.ts";

/** What a flashcard held before a save in doubt: a draft, or null for a new card. */
type Before = FlashcardDraft | null;

/**
 * Remembers the saves whose landing the user has not been shown, so that discarding their card can take them back:
 * a save that timed out, until any later work on the flashcard succeeds through `queue`;
 * and a retry from the list of unsaved flashcards while it is under way and no later save of the flashcard has started.
 * For each, it keeps what the flashcard held before.
 */
export function createSavesInDoubt(queue: SaveQueue) {
  const timedOut = new Map<string, Before>();
  const retries = new Map<string, { before: Before }>();
  queue.onSuccess((flashcardId) => timedOut.delete(flashcardId));
  /** Notes how a save of the flashcard with `before` as its earlier content turns out. A later save supersedes any retry under way. */
  const watch = (
    flashcardId: string,
    before: Before,
    saving: Promise<Flashcard>,
  ) => {
    retries.delete(flashcardId);
    return saving.catch((error: unknown) => {
      if (error instanceof TimeLimitError && !timedOut.has(flashcardId))
        timedOut.set(flashcardId, before);
      throw error;
    });
  };
  return {
    watch,
    /** Notes a retry from the list, which stays in doubt while it is under way, then how it turns out. */
    watchRetry(
      flashcardId: string,
      before: Before,
      saving: Promise<Flashcard>,
    ) {
      const watched = watch(flashcardId, before, saving);
      const retry = { before };
      retries.set(flashcardId, retry);
      const settle = () => {
        if (retries.get(flashcardId) === retry) retries.delete(flashcardId);
      };
      return watched.finally(settle);
    },
    /**
     * Forgets a flashcard's saves in doubt and returns what the flashcard held before the earliest of them,
     * or undefined when none is in doubt.
     */
    take(flashcardId: string): Before | undefined {
      const before = timedOut.has(flashcardId)
        ? timedOut.get(flashcardId)
        : retries.get(flashcardId)?.before;
      timedOut.delete(flashcardId);
      retries.delete(flashcardId);
      return before;
    },
  };
}

export type SavesInDoubt = ReturnType<typeof createSavesInDoubt>;
