import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { EditedFlashcard } from "./editedFlashcard.ts";

/** The backend requests that save and delete a project's flashcards. */
export function useFlashcardRequests(projectId: string) {
  const [createFlashcard] = useCreateFlashcardMutation();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const [deleteFlashcard] = useDeleteFlashcardMutation();
  const requestReplace = (
    flashcard: Flashcard,
    changes: Partial<FlashcardDraft>,
  ) =>
    updateFlashcard({
      projectId,
      flashcardId: flashcard.id,
      draft: { ...draftOf(flashcard), ...changes },
    });
  const replace = (flashcard: Flashcard, changes: Partial<FlashcardDraft>) =>
    requestReplace(flashcard, changes).unwrap();
  return {
    replace,
    /**
     * Sends a card as the editor holds it: a new card is created under its own id, a saved one replaced.
     * Resolves the flashcard as saved. The request stops once `signal` aborts.
     */
    send: (card: EditedFlashcard, signal?: AbortSignal): Promise<Flashcard> => {
      const changes = {
        content: card.editor.content,
        included_fields: [...card.editor.includedFields],
      };
      const pending =
        card.kind === "new"
          ? createFlashcard({
              projectId,
              flashcard: {
                id: card.flashcardId,
                draft: { ...card.draft, ...changes },
              },
            })
          : requestReplace(card.flashcard, changes);
      signal?.addEventListener("abort", () => pending.abort(), { once: true });
      return pending.unwrap();
    },
    remove: (flashcard: Flashcard) =>
      deleteFlashcard({ projectId, flashcardId: flashcard.id }).unwrap(),
    /** Takes back a save of the card: deletes a card it created, or puts back what a saved card held when it was opened. */
    undoSave: (card: EditedFlashcard, saved: Flashcard): Promise<unknown> =>
      card.kind === "new"
        ? deleteFlashcard({ projectId, flashcardId: saved.id }).unwrap()
        : replace(card.flashcard, {
            content: card.flashcard.content,
            included_fields: card.flashcard.included_fields,
          }),
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
