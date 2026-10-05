import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect, useState } from "react";
import { useNotices } from "../notices/NoticesContext.tsx";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import type { createSaveQueue } from "./saveQueue.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";
import { TimeLimitError } from "./withTimeLimit.ts";

/**
 * Remembers the flashcards whose save timed out, so that whether it landed is unknown,
 * until any later work on the flashcard succeeds, be it a save, a retiming, an Undo or a deletion.
 * Discarding such a card takes the save back, through `queue`, so that the discard holds whatever happened to it:
 * a new card is deleted, and a saved one gets back what it held before the first timed-out save.
 */
export function useTimedOutSaves(
  queue: ReturnType<typeof createSaveQueue>,
  requests: ReturnType<typeof useFlashcardRequests>,
) {
  const notices = useNotices();
  const { track } = useUnsavedWorkTracking();
  /** What each flashcard held before its first timed-out save: a draft, or null for a new card. */
  const [beforeById] = useState(() => new Map<string, FlashcardDraft | null>());
  useEffect(
    () => queue.onSuccess((flashcardId) => beforeById.delete(flashcardId)),
    [queue, beforeById],
  );
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
    /** Takes back the timed-out save of a card the user has discarded, if a save of it timed out. */
    cleanUpAfterDiscard: (card: EditedFlashcard) => {
      const flashcardId = flashcardIdOf(card);
      const before = beforeById.get(flashcardId);
      if (before === undefined) return;
      beforeById.delete(flashcardId);
      const cleanup: () => Promise<unknown> =
        before === null || card.kind === "new"
          ? () => requests.removeIfThere(flashcardId)
          : () => requests.replace(card.flashcard, before);
      track(queue.addFor(flashcardId, cleanup, before ?? undefined)).catch(() =>
        notices.show(flashcardNotices.undoFailed(card.editor.content.word)),
      );
    },
  };
}

/** The id a card's flashcard has, or will be created under. */
export function flashcardIdOf(card: EditedFlashcard): string {
  return card.kind === "existing" ? card.flashcard.id : card.flashcardId;
}
