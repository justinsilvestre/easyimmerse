import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import type { EditedFlashcard } from "./editedFlashcard.ts";
import { draftOfEdited, draftOfFlashcard } from "./flashcardDrafts.ts";

/** Gives the backend requests that save and delete the flashcards of a project, for any project. */
export function useFlashcardRequests() {
  const [createFlashcard] = useCreateFlashcardMutation();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const [deleteFlashcard] = useDeleteFlashcardMutation();
  return (projectId: string) => {
    const requestReplace = (
      flashcard: Flashcard,
      changes: Partial<FlashcardDraft>,
    ) =>
      updateFlashcard({
        projectId,
        flashcardId: flashcard.id,
        draft: { ...draftOfFlashcard(flashcard), ...changes },
      });
    const replace = (flashcard: Flashcard, changes: Partial<FlashcardDraft>) =>
      requestReplace(flashcard, changes).unwrap();
    return {
      replace,
      /**
       * Sends a card as the editor holds it: a new card is created under its own id, a saved one replaced.
       * Resolves the flashcard as saved. The request stops once `signal` aborts.
       */
      send: (
        card: EditedFlashcard,
        signal?: AbortSignal,
      ): Promise<Flashcard> => {
        const draft = draftOfEdited(card);
        const pending =
          card.kind === "new"
            ? createFlashcard({
                projectId,
                flashcard: { id: card.flashcardId, draft },
              })
            : requestReplace(card.flashcard, draft);
        signal?.addEventListener("abort", () => pending.abort(), {
          once: true,
        });
        return pending.unwrap();
      },
      remove: (flashcard: Flashcard) =>
        deleteFlashcard({ projectId, flashcardId: flashcard.id }).unwrap(),
      /** Deletes the flashcard with this id if there is one. */
      removeIfThere: (flashcardId: string) =>
        deleteFlashcard({ projectId, flashcardId })
          .unwrap()
          .catch((error: { status?: unknown }) => {
            if (error.status !== 404) throw error;
          }),
      /** Takes back a save of the card: deletes a card it created, or puts back `before`, what a saved card held before the save. */
      undoSave: (
        card: EditedFlashcard,
        saved: Flashcard,
        before: FlashcardDraft | null,
      ): Promise<unknown> =>
        card.kind === "new" || before === null
          ? deleteFlashcard({ projectId, flashcardId: saved.id }).unwrap()
          : replace(card.flashcard, before),
    };
  };
}
