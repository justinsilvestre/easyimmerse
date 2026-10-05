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
  flashcardsOnWaveform,
  reduceEditedFlashcard,
  segmentIdOf,
} from "./editedFlashcard.ts";
import { type EditorAction, moveClipEndpoint } from "./editFlashcard.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";

const noFlashcards: readonly Flashcard[] = [];

/**
 * The flashcards made from one media file, with the one open in the editor and the ways to save, delete, and retime them.
 * Saving a new card creates it; saving an existing one replaces it.
 * Retiming the open card changes only the editor's copy, which is saved with the rest of the editor; any other card is saved at once.
 * A new card started before the media file is known to show pictures gains a screenshot once it is.
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
  const save = () => {
    if (edited === null) return;
    const changes = {
      content: edited.editor.content,
      included_fields: [...edited.editor.includedFields],
    };
    const saving =
      edited.kind === "new"
        ? createFlashcard({
            projectId,
            draft: { ...edited.draft, ...changes },
          }).unwrap()
        : replace(edited.flashcard, changes);
    saving
      .then(() => {
        close();
        setSaved(true);
      })
      .catch(() => notify("The flashcard could not be saved"));
  };
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
    start: (draft: FlashcardDraft) => {
      setSaved(false);
      dispatchEdited({ type: "started", draft });
    },
    /** Fills the new flashcard started from `draft`, if it is still open, from a lookup that answered after it opened. */
    fillFromLookup: (draft: FlashcardDraft, fields: LookupFlashcardFields) =>
      dispatchEdited({ type: "lookupAnswered", draft, fields }),
    open: (id: string) => {
      const flashcard = find(id);
      if (flashcard) dispatchEdited({ type: "opened", flashcard });
    },
    close,
    save,
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
