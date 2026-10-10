import type { Flashcard } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import { newFlashcardSegmentId } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { formOf } from "./flashcardsOnScreen.ts";
import { latestOf } from "./latestFlashcard.ts";
import { selectFlashcardRequests } from "./selectFlashcardRequests.ts";

/** A flashcard as the waveform draws it: its id, or the new card's segment id, and the content the app holds for it. */
export type DrawnFlashcard = Pick<Flashcard, "id" | "content">;

/** The flashcards of a media file as its screen shows them. */
export type MediaFlashcards = {
  /** The listed flashcards of the file, each with the content the latest work on it left. */
  flashcards: readonly Flashcard[];
  /**
   * The flashcards the waveform draws: the listed ones, with the open card's content or a failed save's edits in place of theirs;
   * then the failed saves never saved; then the open card when it is new.
   */
  drawn: readonly DrawnFlashcard[];
};

/** Returns the flashcard open in the form, or null. */
export const selectFlashcardForm = (state: RootState): FlashcardForm | null =>
  formOf(state.app);

/** Returns the flashcards of a media file, from the cached list `listed`, as `MediaFlashcards` describes. */
export const selectMediaFlashcards = createSelector(
  [
    (_state: RootState, listed: readonly Flashcard[] | undefined) => listed,
    (_state: RootState, _listed: unknown, mediaFileId: string) => mediaFileId,
    selectFlashcardRequests,
    (state: RootState) => state.app.flashcards,
    selectFlashcardForm,
  ],
  (listed, mediaFileId, requests, { confirmed, failedSaves }, form) => {
    const flashcards = (listed ?? [])
      .filter((flashcard) => flashcard.media_file_id === mediaFileId)
      .map((flashcard) => latestOf(flashcard, requests, confirmed));
    const failed = failedSaves.filter(
      (failedSave) => failedSave.mediaFileId === mediaFileId,
    );
    return { flashcards, drawn: drawnFlashcards(flashcards, failed, form) };
  },
);

function drawnFlashcards(
  flashcards: readonly Flashcard[],
  failedSaves: readonly FailedSave[],
  form: FlashcardForm | null,
): DrawnFlashcard[] {
  const failed = failedSaves.map((failedSave) => ({
    id: failedSaveIdOf(failedSave),
    content: failedSave.card.editor.content,
  }));
  const openId = form?.card.kind === "existing" ? form.card.flashcard.id : null;
  const contentOf = ({ id, content }: DrawnFlashcard) =>
    id === openId && form
      ? form.card.editor.content
      : (failed.find((card) => card.id === id)?.content ?? content);
  const listed = flashcards.map((flashcard) => ({
    id: flashcard.id,
    content: contentOf(flashcard),
  }));
  const neverSaved = failed.filter(
    (card) => !flashcards.some((flashcard) => flashcard.id === card.id),
  );
  const drawn = [...listed, ...neverSaved];
  return form?.card.kind === "new"
    ? [
        ...drawn,
        { id: newFlashcardSegmentId, content: form.card.editor.content },
      ]
    : drawn;
}
