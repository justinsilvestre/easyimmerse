import { useListFlashcardsQuery } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect, useReducer, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import {
  flashcardsOnWaveform,
  reduceEditedFlashcard,
} from "./editedFlashcard.ts";
import type { EditorAction } from "./editFlashcard.ts";
import { flashcardRetiming } from "./flashcardRetiming.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";
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
  const [edited, dispatchEdited] = useReducer(reduceEditedFlashcard, null);
  useEffect(() => {
    if (hasScreenshots) dispatchEdited({ type: "screenshotsAvailable" });
  }, [hasScreenshots]);
  const [isSaved, setSaved] = useState(false);
  const requests = useFlashcardRequests(projectId);
  const close = () => dispatchEdited({ type: "closed" });
  const edit = (action: EditorAction) =>
    dispatchEdited({ type: "edited", action });
  const saveLeftCard = useFlashcardSaving(
    edited,
    dispatchEdited,
    requests.send,
    {
      // A card saved in the background is no longer on screen, so only its failure is told, by its word.
      saved: (_card, isInBackground) => {
        if (!isInBackground) setSaved(true);
      },
      failed: (card, isInBackground) =>
        notify(
          isInBackground
            ? `Couldn't save the flashcard for “${card.editor.content.word}”.`
            : "The flashcard could not be saved",
        ),
    },
  );
  /**
   * Replaces the open card in the editor by calling `openNext`, after saving the open card as it is, in the background,
   * if the user has asked to save it or has changed it.
   */
  const replaceOpenCard = (openNext: () => void) => {
    saveLeftCard();
    openNext();
  };
  return {
    flashcards,
    segments: flashcardSegmentsOf(flashcardsOnWaveform(flashcards, edited)),
    cueIndexes: flashcards.flatMap((flashcard) =>
      flashcard.cue_index === null ? [] : [flashcard.cue_index],
    ),
    edited,
    edit,
    isSaved,
    dismissSaved: () => setSaved(false),
    /**
     * Starts a new card. `lateFields` gives the fields of its word's lookup once it answers, or null when it fails,
     * and the card is filled from them if still open; until then a save waits for them.
     * A card it replaces is first saved as it is, if the user asked to save it or changed it.
     */
    start: (
      draft: FlashcardDraft,
      lateFields?: Promise<LookupFlashcardFields | null>,
    ) => {
      setSaved(false);
      replaceOpenCard(() =>
        dispatchEdited({ type: "started", draft, awaitsLookup: !!lateFields }),
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
    /** Opens a saved card. A card it replaces is first saved as it is, if the user asked to save it or changed it. */
    open: (id: string) => {
      const flashcard = flashcards.find((card) => card.id === id);
      if (flashcard)
        replaceOpenCard(() => dispatchEdited({ type: "opened", flashcard }));
    },
    close,
    /** Asks to save the open card. Asking again while a save waits or is under way does nothing. */
    save: () => dispatchEdited({ type: "saveRequested" }),
    remove: () => {
      if (edited?.kind !== "existing") return close();
      requests
        .remove(edited.flashcard)
        .then(close)
        .catch(() => notify("The flashcard could not be deleted"));
    },
    ...flashcardRetiming(flashcards, edited, edit, (flashcard, changes) =>
      requests
        .replace(flashcard, changes)
        .catch(() => notify("The flashcard could not be saved")),
    ),
  };
}
