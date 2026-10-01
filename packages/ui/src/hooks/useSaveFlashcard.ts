import {
  useCreateFlashcardMutation,
  useDeleteFlashcardMutation,
  useUpdateFlashcardMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { NewFlashcard } from "@easyimmerse/types";
import { describeBackendError } from "../describeBackendError.ts";
import { useAppDispatch } from "./useAppDispatch.ts";

/** Returns the flashcard editor's save and delete handlers, which close the editor once the server has the change. */
export function useSaveFlashcard(projectId: string) {
  const dispatch = useAppDispatch();
  const [createFlashcard] = useCreateFlashcardMutation();
  const [updateFlashcard] = useUpdateFlashcardMutation();
  const [removeFlashcard] = useDeleteFlashcardMutation();
  const notify = (message: string) =>
    dispatch(actions.notificationRequested(message));
  const closeIfDone = (result: { error?: unknown }, done: string) => {
    if (result.error !== undefined) {
      notify(
        `Could not change the flashcard: ${describeBackendError(result.error)}`,
      );
      return;
    }
    dispatch(actions.flashcardEditorClosed());
    notify(done);
  };
  return {
    saveFlashcard: async (card: NewFlashcard, flashcardId: string | null) =>
      closeIfDone(
        flashcardId === null
          ? await createFlashcard({ projectId, card })
          : await updateFlashcard({ projectId, flashcardId, card }),
        "Flashcard saved",
      ),
    deleteFlashcard: async (flashcardId: string | null) => {
      if (flashcardId === null) {
        dispatch(actions.flashcardEditorClosed());
        return;
      }
      closeIfDone(
        await removeFlashcard({ projectId, flashcardId }),
        "Flashcard deleted",
      );
    },
  };
}
