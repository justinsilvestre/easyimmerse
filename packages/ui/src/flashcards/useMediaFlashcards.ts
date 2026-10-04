import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useListFlashcardsQuery,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type {
  Flashcard,
  FlashcardContent,
  FlashcardDraft,
  FlashcardFieldKey,
} from "@easyimmerse/types";
import { useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { flashcardSegmentsOf } from "./flashcardSegmentsOf.ts";

/** The flashcard open in the editor: one not saved yet, or one the project holds. */
export type EditedFlashcard =
  | { kind: "new"; draft: FlashcardDraft }
  | { kind: "existing"; flashcard: Flashcard };

const noFlashcards: readonly Flashcard[] = [];

/**
 * The flashcards made from one media file, with the one open in the editor and the ways to save,
 * delete, and retime them. Saving a new card creates it; saving an existing one replaces it.
 */
export function useMediaFlashcards(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const notify = (message: string) =>
    dispatch(actions.notificationRequested(message));
  const { data } = useListFlashcardsQuery(projectId);
  const flashcards = (data?.flashcards ?? noFlashcards).filter(
    (flashcard) => flashcard.media_file_id === mediaFileId,
  );
  const [edited, setEdited] = useState<EditedFlashcard | null>(null);
  const [isSaved, setSaved] = useState(false);
  const [createFlashcard] = useCreateFlashcardMutation();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const [deleteFlashcard] = useDeleteFlashcardMutation();
  const replace = (flashcard: Flashcard, changes: Partial<FlashcardDraft>) =>
    updateFlashcard({
      projectId,
      flashcardId: flashcard.id,
      draft: { ...draftOf(flashcard), ...changes },
    })
      .unwrap()
      .catch(() => notify("The flashcard could not be saved"));
  const save = (
    content: FlashcardContent,
    fields: readonly FlashcardFieldKey[],
  ) => {
    if (edited === null) return;
    const changes = { content, included_fields: [...fields] };
    const saving =
      edited.kind === "new"
        ? createFlashcard({ projectId, draft: { ...edited.draft, ...changes } })
        : updateFlashcard({
            projectId,
            flashcardId: edited.flashcard.id,
            draft: { ...draftOf(edited.flashcard), ...changes },
          });
    saving
      .unwrap()
      .then(() => {
        setEdited(null);
        setSaved(true);
      })
      .catch(() => notify("The flashcard could not be saved"));
  };
  const remove = () => {
    if (edited?.kind !== "existing") return setEdited(null);
    deleteFlashcard({ projectId, flashcardId: edited.flashcard.id })
      .unwrap()
      .then(() => setEdited(null))
      .catch(() => notify("The flashcard could not be deleted"));
  };
  const find = (id: string) =>
    flashcards.find((flashcard) => flashcard.id === id);
  return {
    flashcards,
    segments: flashcardSegmentsOf(flashcards),
    cueIndexes: flashcards.flatMap((flashcard) =>
      flashcard.cue_index === null ? [] : [flashcard.cue_index],
    ),
    edited,
    isSaved,
    dismissSaved: () => setSaved(false),
    start: (draft: FlashcardDraft) => {
      setSaved(false);
      setEdited({ kind: "new", draft });
    },
    open: (id: string) => {
      const flashcard = find(id);
      if (flashcard) setEdited({ kind: "existing", flashcard });
    },
    close: () => setEdited(null),
    save,
    remove,
    moveClipEndpoint: (id: string, endpoint: "start" | "end", ms: number) => {
      const flashcard = find(id);
      const clip = flashcard?.content.audio_context;
      if (!flashcard || !clip) return;
      const moved =
        endpoint === "start"
          ? { ...clip, start_ms: Math.round(Math.min(ms, clip.end_ms)) }
          : { ...clip, end_ms: Math.round(Math.max(ms, clip.start_ms)) };
      replace(flashcard, {
        content: { ...flashcard.content, audio_context: moved },
      });
    },
    moveScreenshot: (id: string, ms: number) => {
      const flashcard = find(id);
      if (!flashcard) return;
      replace(flashcard, {
        content: {
          ...flashcard.content,
          screenshot: { at_ms: Math.round(ms) },
        },
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
