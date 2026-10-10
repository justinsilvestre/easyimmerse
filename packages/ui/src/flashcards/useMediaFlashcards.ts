import { useListFlashcardsQuery } from "@easyimmerse/backend";
import { actions, transientNotice } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect, useMemo } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import {
  createCardSession,
  createFlashcardId,
  flashcardsOnWaveform,
  segmentIdOf,
  startedFlashcard,
} from "./editedFlashcard.ts";
import type { EditorAction } from "./editFlashcard.ts";
import { flashcardRetiming } from "./flashcardRetiming.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";
import { useUnsavedCards } from "./SharedSavingContext.tsx";
import { useListedCardsOf } from "./unsaved/useListedCardsOf.ts";
import { useOpeningOfUnsavedCards } from "./unsaved/useOpeningOfUnsavedCards.ts";
import { useUnsavedCardActions } from "./unsaved/useUnsavedCardActions.ts";
import { useEditedFlashcard } from "./useEditedFlashcard.ts";
import { useFlashcardSaving } from "./useFlashcardSaving.ts";

const noFlashcards: readonly Flashcard[] = [];

/**
 * The flashcards made from one media file, with the one open in the editor and the ways to save, delete, and retime them.
 * Saving a new card creates it; saving an existing one replaces it.
 * Only the open card can be retimed, and only in the editor's copy, which is saved with the rest of the editor.
 * The waveform draws each card with the content the app holds for it.
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
  const notifyFailure = (message: string) =>
    dispatch(actions.noticeRequested(transientNotice("danger", message)));
  const { data } = useListFlashcardsQuery(projectId);
  const flashcards = useMemo(
    () =>
      (data?.flashcards ?? noFlashcards).filter(
        (flashcard) => flashcard.media_file_id === mediaFileId,
      ),
    [data, mediaFileId],
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
  useOpeningOfUnsavedCards(projectId, mediaFileId, saving.reopen);
  const listedCards = useListedCardsOf(mediaFileId);
  /**
   * Opens a saved card as last sent, withdrawing the Undo of its last save. The card it replaces is saved as it leaves.
   * A card listed as not saved opens with its edits, as its Open in the list does.
   */
  const open = (id: string) => {
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
  };
  return {
    /** The saved cards of the file, which keep their identity until the list changes. */
    flashcards,
    segments: flashcardSegmentsOf(
      flashcardsOnWaveform(flashcards, listedCards, edited),
    ),
    cueIndexes: flashcards.flatMap((flashcard) =>
      flashcard.cue_index === null ? [] : [flashcard.cue_index],
    ),
    edited,
    /** The waveform segment of the open card, the only one whose clip and screenshot time can be dragged, or null when no card is open. */
    editedSegmentId: edited && segmentIdOf(edited),
    edit,
    /** Whether the save last asked for of the open card failed; see `useFlashcardSaving`. */
    saveFailed: saving.saveFailed,
    /**
     * Starts a new card. `lateFields` gives the fields of its word's lookup once it answers, or null when it fails,
     * and the card is filled from them if still open; until then a save waits for them.
     * The card it replaces is saved as it leaves.
     */
    start: (
      draft: FlashcardDraft,
      lateFields?: Promise<LookupFlashcardFields | null>,
    ) => {
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
     * Saves a new card at once, without opening it, and offers Undo once it is saved, leaving the open card as it is.
     * `lateFields` is as for `start`: the save waits for them as a save from the editor would.
     */
    create: (
      draft: FlashcardDraft,
      lateFields?: Promise<LookupFlashcardFields | null>,
    ) => {
      if (lateFields) saving.rememberLookup(draft, lateFields);
      saving.saveUnopened(
        startedFlashcard({
          type: "started",
          draft,
          awaitsLookup: !!lateFields,
          flashcardId: createFlashcardId(),
          session: createCardSession(),
        }),
      );
    },
    open,
    /** Opens, as `open` does, the card made from the cue at `cueIndex` of the target-language subtitles, when there is one. */
    openForCue: (cueIndex: number) => {
      const card = flashcards.find((listed) => listed.cue_index === cueIndex);
      if (card) open(card.id);
    },
    /**
     * Closes the open card without saving it; a changed one can be brought back from the notice's Undo.
     * A card whose save just failed is listed among the flashcards not saved instead.
     */
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
        .catch(() => notifyFailure("The flashcard could not be deleted"));
    },
    ...flashcardRetiming(edited, edit),
  };
}
