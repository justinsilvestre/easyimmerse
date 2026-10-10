import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { mainScreenMoveOf } from "../route/mainScreenMoveOf.ts";
import { discardFailedSave, restoreFailedSave } from "./failedSaveActions.ts";
import {
  giveUpOpeningsAway,
  openFailedSave,
  settleOpening,
} from "./failedSaveOpening.ts";
import { retryAllFailedSaves, retryFailedSave } from "./failedSaveRetry.ts";
import { formDiscardedKeyPrefix, withdraw } from "./flashcardNotices.ts";
import { sendFlashcardRequest } from "./flashcardRequests.ts";
import { undoRequest } from "./flashcardSaves.ts";
import {
  isFlashcardSettled,
  settleFlashcardRequest,
} from "./settleFlashcardRequest.ts";
import { saveStarted, takeFinished } from "./startedCards.ts";
import {
  fieldsAwaitedBy,
  fillWaitingCards,
  sendLateCard,
} from "./waitingCards.ts";

/**
 * Returns the flashcard requests and notices an action asks for outside the form: flashcards from words saved at once
 * or held for their lookup, the outcomes of flashcard requests, and the failed saves' Retry, Open and Discard.
 * The flashcards keep no state of their own.
 * Each request goes in its flashcard's scope with a time limit, under the first id free for its flashcard.
 */
export function flashcardCommands(action: AppAction, app: AppState) {
  return [
    ...saveStarted(action, app),
    ...takeFinished(action, app),
    ...answer(action, app),
    ...withdrawFormNotices(action, app),
    ...giveUpOpeningsAway(action, app),
  ];
}

function answer(action: AppAction, app: AppState) {
  switch (action.type) {
    case "flashcardFieldsWritten":
      return fillWaitingCards(action.requestId, action.fields, app);
    case "flashcardLookupWaitEnded":
      return sendLateCard(action.flashcardId, app);
    case "failedSaveRetried":
      return retryFailedSave(action.flashcardId, app);
    case "allFailedSavesRetried":
      return retryAllFailedSaves(app);
    case "failedSaveOpened":
      return openFailedSave(action.flashcardId, app);
    case "failedSaveDiscarded":
      return discardFailedSave(action.flashcardId, app);
    case "failedSaveDiscardUndone":
      return restoreFailedSave(action.kept, app);
    case "saveUndoRequested":
      return [
        sendFlashcardRequest(undoRequest(action.undo), app, "background"),
      ];
    case "requestSettled":
      return [
        ...fieldsAwaitedBy(action, app),
        ...(isFlashcardSettled(action)
          ? settleFlashcardRequest(action, app)
          : settleOpening(action, app)),
      ];
    default:
      return [];
  }
}

/** Withdraws, as the screen closes, the undo toasts of closed forms, since their Undo needs the form. */
function withdrawFormNotices(action: AppAction, app: AppState) {
  if (mainScreenMoveOf(app, action)?.from.screen !== "media") return [];
  return app.notices.shown.flatMap(({ key }) =>
    key?.startsWith(formDiscardedKeyPrefix) ? [withdraw(key)] : [],
  );
}
