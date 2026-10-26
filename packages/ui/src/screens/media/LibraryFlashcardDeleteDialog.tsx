import {
  actions,
  selectAnkiFateOfDeletion,
  selectLibraryEdit,
} from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import { FlashcardDeleteDialog } from "../../components/flashcards/FlashcardDeleteDialog.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";

/**
 * Asks to confirm the deletion of a flashcard made from the library, once the user has chosen "Delete flashcard" in its menu,
 * and deletes it or takes the request back through the store. Nothing shows while no such deletion waits.
 */
export function LibraryFlashcardDeleteDialog({
  projectId,
  flashcards,
}: {
  projectId: string;
  /** The flashcards of the media file, among which the one to delete is found. */
  flashcards: readonly Flashcard[];
}) {
  const dispatch = useAppDispatch();
  const deletion = useAppSelector((state) => selectLibraryEdit(state).deletion);
  const flashcard =
    deletion?.kind === "flashcard"
      ? flashcards.find(({ id }) => id === deletion.flashcardId)
      : undefined;
  const ankiFate = useAppSelector((state) =>
    flashcard ? selectAnkiFateOfDeletion(state, projectId, flashcard.id) : null,
  );
  if (!flashcard) return null;
  return (
    <FlashcardDeleteDialog
      word={flashcard.content.word}
      ankiFate={ankiFate}
      onCancel={() => dispatch(actions.libraryDeletionAsked(null))}
      onDelete={() =>
        dispatch(actions.flashcardDeleteConfirmed(projectId, flashcard.id))
      }
    />
  );
}
