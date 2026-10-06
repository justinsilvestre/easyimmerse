import { useListFlashcardsQuery } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import {
  createCardSession,
  createFlashcardId,
  flashcardsOnWaveform,
} from "./editedFlashcard.ts";
import type { EditorAction } from "./editFlashcard.ts";
import { flashcardRetiming, type Retiming } from "./flashcardRetiming.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";
import { useUnsavedCards } from "./SharedSavingContext.tsx";
import { useOpeningOfUnsavedCards } from "./unsaved/useOpeningOfUnsavedCards.ts";
import { useUnsavedCardActions } from "./unsaved/useUnsavedCardActions.ts";
import { useEditedFlashcard } from "./useEditedFlashcard.ts";
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
  const unsavedCards = useUnsavedCards();
  const unsavedCardActions = useUnsavedCardActions();
  const edit = (action: EditorAction) =>
    dispatchEdited({ type: "edited", action });
  const saving = useFlashcardSaving(
    edited,
    dispatchEdited,
    projectId,
    openSession,
  );
  const { replaceOpenCard } = saving;
  useOpeningOfUnsavedCards(mediaFileId, saving.reopen);
  /**
   * Retimes a card that is not open. A card listed as not saved changes only in its listed edits, to be sent on Retry;
   * any other is saved at once, from its latest content, after any earlier work on it.
   */
  const retimeNow = (id: string, retiming: Retiming) => {
    if (unsavedCards.find(id)) return unsavedCards.editContent(id, retiming);
    const flashcard = flashcards.find((listed) => listed.id === id);
    if (!flashcard) return;
    const { content } = saving.latestOf(flashcard);
    const retimed = retiming(content);
    if (retimed === content) return;
    saving
      .replace(flashcard, { content: retimed })
      .catch(() => notify("The flashcard could not be saved"));
  };
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
          flashcardId: createFlashcardId(),
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
    /**
     * Opens a saved card as last sent, withdrawing the Undo of its last save. The card it replaces is saved as it leaves.
     * A card listed as not saved opens with its edits, as its Open in the list does.
     */
    open: (id: string) => {
      if (unsavedCards.find(id)) return unsavedCardActions.open(id);
      const listed = flashcards.find((card) => card.id === id);
      if (!listed) return;
      // Undoing the save now would change the card under the editor, so only saving it again from there remains.
      saving.withdrawUndo(id);
      // Read once the card being replaced has been sent, which may be this very flashcard.
      replaceOpenCard(() =>
        dispatchEdited({
          type: "opened",
          flashcard: saving.latestOf(listed),
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
    ...flashcardRetiming(edited, edit, retimeNow),
  };
}
