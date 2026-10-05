import { useListFlashcardsQuery } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { createCardSession, flashcardsOnWaveform } from "./editedFlashcard.ts";
import type { EditorAction } from "./editFlashcard.ts";
import { flashcardRetiming } from "./flashcardRetiming.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";
import { useEditedFlashcard } from "./useEditedFlashcard.ts";
import { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useFlashcardSaving } from "./useFlashcardSaving.ts";

const noFlashcards: readonly Flashcard[] = [];

/**
 * The flashcards made from one media file, with the one open in the editor and the ways to save, delete, and retime them.
 * Saving a new card creates it; saving an existing one replaces it.
 * Retiming the open card changes only the editor's copy, which is saved with the rest of the editor; any other card is saved at once.
 * A new card started before the media file is known to show pictures gains a screenshot once it is.
 * A new card whose word's lookup has yet to answer is saved only once it answers, fails or takes too long,
 * so that its definitions are saved with it.
 * A card the editor leaves, for another card or as the screen closes, is saved as it is; see `useFlashcardSaving`.
 */
export function useMediaFlashcards(
  projectId: string,
  mediaFileId: string,
  hasScreenshots: boolean,
) {
  const dispatch = useAppDispatch();
  const notify = (message: string) =>
    dispatch(actions.notificationRequested(message));
  const { data } = useListFlashcardsQuery(projectId);
  const flashcards = (data?.flashcards ?? noFlashcards).filter(
    (flashcard) => flashcard.media_file_id === mediaFileId,
  );
  const { edited, dispatchEdited, openSession } = useEditedFlashcard();
  useEffect(() => {
    if (hasScreenshots) dispatchEdited({ type: "screenshotsAvailable" });
  }, [hasScreenshots, dispatchEdited]);
  const requests = useFlashcardRequests(projectId);
  const edit = (action: EditorAction) =>
    dispatchEdited({ type: "edited", action });
  const saving = useFlashcardSaving(
    edited,
    dispatchEdited,
    requests,
    openSession,
  );
  const { replaceOpenCard } = saving;
  return {
    flashcards,
    segments: flashcardSegmentsOf(flashcardsOnWaveform(flashcards, edited)),
    cueIndexes: flashcards.flatMap((flashcard) =>
      flashcard.cue_index === null ? [] : [flashcard.cue_index],
    ),
    edited,
    edit,
    isSaved: saving.isSaved,
    dismissSaved: saving.dismissSaved,
    /**
     * Starts a new card. `lateFields` gives the fields of its word's lookup once it answers, or null when it fails,
     * and the card is filled from them if still open; until then a save waits for them.
     * The card it replaces is saved as it leaves.
     */
    start: (
      draft: FlashcardDraft,
      lateFields?: Promise<LookupFlashcardFields | null>,
    ) => {
      saving.dismissSaved();
      if (lateFields) saving.rememberLookup(draft, lateFields);
      replaceOpenCard(() =>
        dispatchEdited({
          type: "started",
          draft,
          awaitsLookup: !!lateFields,
          session: createCardSession(),
        }),
      );
      const fail = () => dispatchEdited({ type: "lookupFailed", draft });
      lateFields?.then(
        (fields) =>
          fields
            ? dispatchEdited({ type: "lookupAnswered", draft, fields })
            : fail(),
        fail,
      );
    },
    /** Opens a saved card, withdrawing the Undo of its last save. The card it replaces is saved as it leaves. */
    open: (id: string) => {
      const flashcard = flashcards.find((card) => card.id === id);
      if (!flashcard) return;
      // Undoing the save now would change the card under the editor, so only saving it again from there remains.
      saving.withdrawUndo(id);
      replaceOpenCard(() =>
        dispatchEdited({
          type: "opened",
          flashcard,
          session: createCardSession(),
        }),
      );
    },
    /** Closes the open card without saving it; a changed one can be brought back from the notice's Undo. */
    close: () => {
      if (edited) saving.discard(edited);
    },
    /** Asks to save the open card. Asking again while a save waits or is under way does nothing. */
    save: () => dispatchEdited({ type: "saveRequested" }),
    remove: () => {
      const close = () => dispatchEdited({ type: "closed" });
      if (edited?.kind !== "existing") return close();
      saving
        .remove(edited.flashcard)
        .then(close)
        .catch(() => notify("The flashcard could not be deleted"));
    },
    ...flashcardRetiming(flashcards, edited, edit, (flashcard, changes) =>
      saving
        .replace(flashcard, changes)
        .catch(() => notify("The flashcard could not be saved")),
    ),
  };
}
