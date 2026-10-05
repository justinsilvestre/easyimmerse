import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useListFlashcardsQuery,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { useEffect, useReducer, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import {
  type EditedFlashcard,
  flashcardsOnWaveform,
  reduceEditedFlashcard,
  segmentIdOf,
} from "./editedFlashcard.ts";
import { type EditorAction, moveClipEndpoint } from "./editFlashcard.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";
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
  const [createFlashcard] = useCreateFlashcardMutation();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const [deleteFlashcard] = useDeleteFlashcardMutation();
  const replace = (flashcard: Flashcard, changes: Partial<FlashcardDraft>) =>
    updateFlashcard({
      projectId,
      flashcardId: flashcard.id,
      draft: { ...draftOf(flashcard), ...changes },
    }).unwrap();
  const replaceNow = (flashcard: Flashcard, changes: Partial<FlashcardDraft>) =>
    replace(flashcard, changes).catch(() =>
      notify("The flashcard could not be saved"),
    );
  const close = () => dispatchEdited({ type: "closed" });
  const edit = (action: EditorAction) =>
    dispatchEdited({ type: "edited", action });
  /** Sends a card as the editor holds it. */
  const send = (card: EditedFlashcard) => {
    const changes = {
      content: card.editor.content,
      included_fields: [...card.editor.includedFields],
    };
    return card.kind === "new"
      ? createFlashcard({
          projectId,
          draft: { ...card.draft, ...changes },
        }).unwrap()
      : replace(card.flashcard, changes);
  };
  const saveWaitingCard = useFlashcardSaving(edited, dispatchEdited, send, {
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
  });
  const remove = () => {
    if (edited?.kind !== "existing") return close();
    deleteFlashcard({ projectId, flashcardId: edited.flashcard.id })
      .unwrap()
      .then(close)
      .catch(() => notify("The flashcard could not be deleted"));
  };
  const find = (id: string) =>
    flashcards.find((flashcard) => flashcard.id === id);
  const isOpen = (id: string) => edited !== null && segmentIdOf(edited) === id;
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
     * A card it replaces whose save was waiting is saved at once, as it is.
     */
    start: (
      draft: FlashcardDraft,
      lateFields?: Promise<LookupFlashcardFields | null>,
    ) => {
      setSaved(false);
      saveWaitingCard();
      dispatchEdited({ type: "started", draft, awaitsLookup: !!lateFields });
      const fail = () => dispatchEdited({ type: "lookupFailed", draft });
      lateFields?.then(
        (fields) =>
          fields
            ? dispatchEdited({ type: "lookupAnswered", draft, fields })
            : fail(),
        fail,
      );
    },
    /** Opens a saved card. A card it replaces whose save was waiting is saved at once, as it is. */
    open: (id: string) => {
      const flashcard = find(id);
      if (!flashcard) return;
      saveWaitingCard();
      dispatchEdited({ type: "opened", flashcard });
    },
    close,
    /** Asks to save the open card. Asking again while a save waits or is under way does nothing. */
    save: () => dispatchEdited({ type: "saveRequested" }),
    remove,
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const content = isOpen(id) ? edited?.editor.content : find(id)?.content;
      const clip = content?.audio_context;
      if (!clip) return;
      const moved = moveClipEndpoint(clip, endpoint, ms);
      if (isOpen(id)) return edit({ type: "clipChanged", clip: moved });
      const flashcard = find(id);
      if (flashcard)
        replaceNow(flashcard, {
          content: { ...flashcard.content, audio_context: moved },
        });
    },
    moveScreenshot: (id: string, ms: number) => {
      const atMs = Math.round(ms);
      if (isOpen(id)) return edit({ type: "screenshotMsChanged", ms: atMs });
      const flashcard = find(id);
      if (flashcard)
        replaceNow(flashcard, {
          content: { ...flashcard.content, screenshot: { at_ms: atMs } },
        });
    },
  };
}

function draftOf(flashcard: Flashcard): FlashcardDraft {
  return {
    media_file_id: flashcard.media_file_id,
    cue_index: flashcard.cue_index,
    content: flashcard.content,
    included_fields: flashcard.included_fields,
  };
}
