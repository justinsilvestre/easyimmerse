import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { forgetFailedSave } from "./failedSaveKeeping.ts";
import { selectFailedSave } from "./failedSaveSelectors.ts";
import type { FlashcardApp } from "./flashcardApp.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
  wordOf,
} from "./flashcardNotices.ts";
import type { SavePurpose } from "./flashcardRequests.ts";
import type { SaveUndo } from "./flashcardSaves.ts";
import type { FlashcardSettled } from "./settleFlashcardRequest.ts";

type Save = Extract<FlashcardSettled, { request: { kind: "saveFlashcard" } }>;
type CardSave = Extract<SavePurpose, { type: "save" }>;

/**
 * Forgets the failed save of a flashcard whose card was saved, since the save holds the newer edits,
 * drops a Retry of it still waiting, and shows its undo toast when the save offers one.
 * An Undo or rollback that lands leaves the failed saves as they are.
 */
export function saveLanded({ id, request }: Save, app: FlashcardApp) {
  const { flashcardId, projectId, purpose } = request;
  if (purpose.type !== "save") return [];
  const undo = {
    projectId,
    flashcardId,
    word: wordOf(purpose.card),
    before: purpose.before,
  };
  return [
    ...failedSaveForgetting(app, flashcardId),
    ...selectWaitingRetries(app, flashcardId, id).map(
      (waitingId) => ({ type: "abortRequest", id: waitingId }) satisfies Effect,
    ),
    ...undoNotices(purpose, id, app, undo),
  ];
}

/** Forgets the failed save of the flashcard, if it has one, and withdraws the notice of its refusal. */
function failedSaveForgetting(app: FlashcardApp, flashcardId: string) {
  if (!selectFailedSave(app, flashcardId)) return [];
  return [
    forgetFailedSave(flashcardId),
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
  ];
}

/** Shows the undo toast of a landed save that offers one. */
function undoNotices(
  purpose: CardSave,
  id: string,
  app: FlashcardApp,
  undo: SaveUndo,
) {
  if (!isUndoOffered(purpose, id, app)) return [];
  return [show(flashcardNotices.savedWithUndo(undo))];
}

/** A form's save offers Undo only while its card is still open; a Retry never does. */
function isUndoOffered(
  purpose: CardSave,
  id: string,
  app: FlashcardApp,
): boolean {
  if (purpose.from === "form")
    return selectFlashcardForm(app)?.sentRequestId === id;
  return purpose.offersUndo;
}

/** The waiting Retries of a flashcard other than the request that just landed, which that request has made pointless. */
function selectWaitingRetries(
  app: Pick<AppState, "operations">,
  flashcardId: string,
  landedId: string,
): readonly string[] {
  return app.operations.requests.flatMap(({ id, request, isWaiting }) =>
    isWaiting &&
    id !== landedId &&
    request.kind === "saveFlashcard" &&
    request.flashcardId === flashcardId &&
    request.purpose.type === "save" &&
    request.purpose.from === "retry"
      ? [id]
      : [],
  );
}
