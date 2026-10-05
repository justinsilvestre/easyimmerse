import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { saveRequestLimitMs } from "../lookup/lookupTiming.ts";
import { useNotices } from "../notices/NoticesContext.tsx";
import { type EditedFlashcard, flashcardIdOf } from "./editedFlashcard.ts";
import { draftOfFlashcard } from "./flashcardDrafts.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import { useSharedSaving } from "./SharedSavingContext.tsx";
import { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useSaveUndo } from "./useSaveUndo.ts";
import { useUnsavedWorkTracking } from "./useUnsavedWorkTracking.ts";
import { withTimeLimit } from "./withTimeLimit.ts";

/**
 * Sends work on flashcards through the app's one save queue, so that work on a flashcard is ordered whichever screen sends it.
 * A save left unanswered for `saveRequestLimitMs` counts as failed, and stays in doubt until later work on its flashcard succeeds.
 * The caller counts work, with what it does on settling, as unsaved work through `track`.
 */
export function useQueuedSaving() {
  const { queue, timedOutSaves } = useSharedSaving();
  const requestsFor = useFlashcardRequests();
  const undo = useSaveUndo();
  const notices = useNotices();
  const { track } = useUnsavedWorkTracking();
  /** A saved flashcard as the latest work on it left it, which the list of flashcards may not show yet. */
  const latestOf = (flashcard: Flashcard) => queue.latestOf(flashcard);
  /** What a card's flashcard holds before its save: the draft last sent for a saved one, or nothing for a new one. */
  const beforeOf = (card: EditedFlashcard): FlashcardDraft | null =>
    card.kind === "existing"
      ? draftOfFlashcard(latestOf(card.flashcard))
      : null;
  return {
    undo,
    track,
    latestOf,
    beforeOf,
    /** Sends a card's save to the project `projectId`, or returns undefined when this opening's save is already under way. */
    send(card: EditedFlashcard, projectId: string) {
      const flashcardId = flashcardIdOf(card);
      const before = beforeOf(card);
      undo.withdraw(flashcardId);
      const saving = queue.add(card, () =>
        withTimeLimit(
          (signal) => requestsFor(projectId).send(card, signal),
          saveRequestLimitMs,
        ),
      );
      return saving && timedOutSaves.watch(flashcardId, before, saving);
    },
    /** Deletes a saved flashcard after any earlier work on it. */
    remove: (flashcard: Flashcard) => {
      undo.withdraw(flashcard.id);
      return track(
        queue.addFor(flashcard.id, () =>
          requestsFor(flashcard.project_id).remove(flashcard),
        ),
      );
    },
    /** Saves changes to a flashcard that is not open in the editor, after any earlier work on it. */
    replace: (flashcard: Flashcard, changes: Partial<FlashcardDraft>) => {
      undo.withdraw(flashcard.id);
      const latest = latestOf(flashcard);
      const draft = { ...draftOfFlashcard(latest), ...changes };
      return track(
        queue.addFor(
          flashcard.id,
          () => requestsFor(flashcard.project_id).replace(latest, changes),
          draft,
        ),
      );
    },
    /**
     * Takes back the timed-out save of a card the user has discarded, if a save of it timed out:
     * a new card is deleted, and a saved one gets back what it held before the first timed-out save.
     */
    cleanUpAfterDiscard(card: EditedFlashcard, projectId: string) {
      const flashcardId = flashcardIdOf(card);
      const before = timedOutSaves.take(flashcardId);
      if (before === undefined) return;
      const requests = requestsFor(projectId);
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
