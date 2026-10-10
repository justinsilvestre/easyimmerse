import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";
import type { AppRoot } from "../app/createAppStore.ts";
import { selectPendingFlashcard } from "../screen/lookup/lookupSelectors.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import { selectFailedSaves } from "./failedSaveSelectors.ts";
import { type FlashcardCard, newFlashcardSegmentId } from "./flashcardCard.ts";
import { draftOfFlashcard } from "./flashcardDrafts.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { isFlashcardScope } from "./flashcardRequests.ts";
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

/** Returns the flashcards of a media file, from the cached list `listed`, as `MediaFlashcards` describes. */
export const selectMediaFlashcards = createSelector(
  [
    (
      state: AppRoot,
      listed: readonly Flashcard[] | undefined,
      mediaFileId: string,
    ) => selectListedMediaFlashcards(state, listed, mediaFileId),
    (_state: AppRoot, _listed: unknown, mediaFileId: string) => mediaFileId,
    (state: AppRoot) => selectFailedSaves(state.app),
    (state: AppRoot) => selectFlashcardForm(state.app),
  ],
  (flashcards, mediaFileId, failedSaves, form) => {
    const failed = failedSaves.filter(
      (failedSave) => failedSave.mediaFileId === mediaFileId,
    );
    return { flashcards, drawn: drawnFlashcards(flashcards, failed, form) };
  },
);

/** The listed flashcards of a media file, kept apart from the open card so that editing it leaves them as they were. */
const selectListedMediaFlashcards = createSelector(
  [
    (_state: AppRoot, listed: readonly Flashcard[] | undefined) => listed,
    (_state: AppRoot, _listed: unknown, mediaFileId: string) => mediaFileId,
    selectFlashcardRequests,
  ],
  (listed, mediaFileId, requests) =>
    (listed ?? [])
      .filter((flashcard) => flashcard.media_file_id === mediaFileId)
      .map((flashcard) => latestOf(flashcard, requests)),
);

/**
 * Returns a flashcard as the latest work on it leaves it, which the cached list, holding `listed`, may not show yet:
 * `listed` with the draft of its latest pending save.
 */
export function selectLatestFlashcard(
  app: Pick<AppState, "operations">,
  listed: Flashcard,
): Flashcard {
  return latestOf(listed, app.operations.requests);
}

/** Returns what a card's flashcard holds before a save asked for now: its latest content for a saved one, or nothing for a new one. */
export function selectContentBeforeSave(
  app: Pick<AppState, "operations">,
  card: FlashcardCard,
): FlashcardDraft | null {
  return card.kind === "existing"
    ? draftOfFlashcard(selectLatestFlashcard(app, card.flashcard))
    : null;
}

/** The app state that the unsaved work count reads. */
type UnsavedWorkApp = Pick<AppState, "operations" | "route" | "screen">;

/**
 * Counts the pieces of flashcard work that closing the app would lose: the open form while it is changed,
 * asked to save, sending or failed; each flashcard request pending or held for its lookup; each failed save;
 * and a flashcard from a word waiting for its lookup. Only whether the count is zero matters.
 */
export const selectUnsavedWorkCount = createSelector(
  [
    (app: UnsavedWorkApp) => app.operations,
    (app: UnsavedWorkApp) => selectFlashcardForm(app),
    (app: UnsavedWorkApp) => selectPendingFlashcard(app),
  ],
  (operations, form, pending): number => {
    const requests = operations.requests.filter(({ scope }) =>
      isFlashcardScope(scope),
    ).length;
    return (
      (isFormAtRisk(form) ? 1 : 0) +
      requests +
      selectFailedSaves({ operations }).length +
      (pending === null ? 0 : 1)
    );
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

function isFormAtRisk(form: FlashcardForm | null): boolean {
  return (
    form !== null &&
    (form.card.isChanged ||
      form.stage === "awaitingLookupToSave" ||
      form.stage === "sending" ||
      form.saveFailure !== null)
  );
}
