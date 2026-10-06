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
 * A save left unanswered for `saveRequestLimitMs` counts as failed, and stays in doubt until later work on its flashcard succeeds;
 * a retry from the list stays in doubt while it is under way. Discarding the card takes back a save in doubt.
 * The caller counts work, with what it does on settling, as unsaved work through `track`.
 */
export function useQueuedSaving() {
  const { queue, savesInDoubt } = useSharedSaving();
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
  const requestSave = (card: EditedFlashcard, projectId: string) =>
    withTimeLimit(
      (signal) => requestsFor(projectId).send(card, signal),
      saveRequestLimitMs,
    );
  const enqueueSave = (
    card: EditedFlashcard,
    send: () => Promise<Flashcard>,
  ) => {
    undo.withdraw(flashcardIdOf(card));
    return queue.add(card, send);
  };
  return {
    undo,
    track,
    latestOf,
    beforeOf,
    /**
     * Sends a card's save to the project `projectId`, or returns undefined when this opening's save is already under way.
     * `onLanded` runs as soon as the save succeeds, before any later work on the flashcard starts.
     */
    send(
      card: EditedFlashcard,
      projectId: string,
      onLanded: () => void = () => undefined,
    ) {
      const before = beforeOf(card);
      const saving = enqueueSave(card, () =>
        requestSave(card, projectId).then((saved) => {
          onLanded();
          return saved;
        }),
      );
      return saving && savesInDoubt.watch(flashcardIdOf(card), before, saving);
    },
    /**
     * Sends a listed card's save again, as `send` does, once earlier work on its flashcard has settled,
     * unless `isStillWanted` then tells that the save is no longer wanted, in which case it rejects with `SaveNotWanted`.
     */
    resend(
      card: EditedFlashcard,
      projectId: string,
      isStillWanted: () => boolean,
    ) {
      const before = beforeOf(card);
      const saving = enqueueSave(card, () =>
        isStillWanted()
          ? requestSave(card, projectId)
          : Promise.reject(new SaveNotWanted()),
      );
      return (
        saving && savesInDoubt.watchRetry(flashcardIdOf(card), before, saving)
      );
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
     * Takes back a save in doubt of a card the user has discarded, after that save has settled:
     * a new card is deleted, and a saved one gets back what it held before the earliest save in doubt.
     */
    cleanUpAfterDiscard(card: EditedFlashcard, projectId: string) {
      const flashcardId = flashcardIdOf(card);
      const before = savesInDoubt.take(flashcardId);
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

/** The rejection of a save that was dropped before it was sent, because it was no longer wanted by then. */
export class SaveNotWanted extends Error {
  constructor() {
    super("The save was no longer wanted when its turn came");
    this.name = "SaveNotWanted";
  }
}
