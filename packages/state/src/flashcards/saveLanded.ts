import type { Flashcard } from "@easyimmerse/types";
import type { AppState } from "../app/appState.ts";
import { withoutFailedSave } from "./failedSaveListing.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
  wordOf,
} from "./flashcardNotices.ts";
import type { FlashcardsContext, SavePurpose } from "./flashcardRequests.ts";
import { formOf } from "./flashcardsOnScreen.ts";
import type { FlashcardsState } from "./flashcardsState.ts";
import type { FlashcardSettled } from "./settleFlashcardRequest.ts";

type Save = Extract<FlashcardSettled, { request: { kind: "saveFlashcard" } }>;
type CardSave = Extract<SavePurpose, { type: "save" }>;

/**
 * Keeps the flashcard a save returned until the list catches up. A save of a card also takes the flashcard off the failed saves,
 * since it holds the newer edits, drops a Retry of it still waiting, and shows its undo toast when it offers one.
 * An Undo or rollback that lands leaves the failed saves as they are.
 */
export function saveLanded(
  state: FlashcardsState,
  { id, request }: Save,
  flashcard: Flashcard,
  { app, outbox }: FlashcardsContext,
): FlashcardsState {
  const { flashcardId, purpose } = request;
  const confirmed = { ...state.confirmed, [flashcardId]: flashcard };
  if (purpose.type !== "save") return { ...state, confirmed };
  const failedSaves = withoutFailedSave(state.failedSaves, flashcardId);
  if (failedSaves !== state.failedSaves)
    outbox.add(withdraw(flashcardNoticeKeys.saveRefused(flashcardId)));
  for (const waitingId of waitingRetriesOf(app, flashcardId, id))
    outbox.add({ type: "abortRequest", id: waitingId });
  if (isUndoOffered(purpose, id, app)) {
    const { projectId } = request;
    const { before } = purpose;
    const word = wordOf(purpose.card);
    outbox.add(
      show(
        flashcardNotices.savedWithUndo({
          projectId,
          flashcardId,
          word,
          before,
        }),
      ),
    );
  }
  return { ...state, confirmed, failedSaves };
}

/** A form's save offers Undo only while its card is still open; a Retry never does. */
function isUndoOffered(purpose: CardSave, id: string, app: AppState): boolean {
  if (purpose.from === "form") return formOf(app)?.sentRequestId === id;
  return purpose.offersUndo;
}

/** The waiting Retries of a flashcard other than the request that just landed, which that request has made pointless. */
function waitingRetriesOf(
  app: AppState,
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
