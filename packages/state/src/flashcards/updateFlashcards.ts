import type { AppAction } from "../app/appAction.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { discardFailedSave, restoreFailedSave } from "./failedSaveActions.ts";
import { withFailedSave, withoutFailedSave } from "./failedSaveListing.ts";
import {
  clearOpeningsAway,
  openFailedSave,
  settleOpening,
} from "./failedSaveOpening.ts";
import { retryAllFailedSaves, retryFailedSave } from "./failedSaveRetry.ts";
import { formDiscardedKeyPrefix, withdraw } from "./flashcardNotices.ts";
import type { FlashcardsContext } from "./flashcardRequests.ts";
import { createFlashcardOutbox } from "./flashcardRequests.ts";
import { undoRequest } from "./flashcardSaves.ts";
import { isLeavingScreen } from "./flashcardsOnScreen.ts";
import { type FlashcardsState, initialFlashcards } from "./flashcardsState.ts";
import type { FormStep } from "./formStep.ts";
import {
  isFlashcardSettled,
  settleFlashcardRequest,
} from "./settleFlashcardRequest.ts";
import { saveStarted, takeFinished } from "./startedCards.ts";
import { stepFlashcardForm } from "./stepFlashcardForm.ts";
import {
  fieldsAwaitedBy,
  fillWaitingCards,
  sendLateCard,
} from "./waitingCards.ts";

/**
 * Updates the flashcard data the server lacks, and sends every flashcard request and notice:
 * what leaves the form as `stepFlashcardForm` describes, flashcards from words saved at once or waiting for their lookup,
 * the outcomes of flashcard requests, and the failed saves' Retry, Open and Discard.
 * Each request goes in its flashcard's scope with a time limit, numbered from the slice's own count.
 */
export const updateFlashcards: FeatureUpdate<FlashcardsState> = (
  state,
  action,
  app,
) => {
  const step = stepFlashcardForm(app, action);
  const context = { app, outbox: createFlashcardOutbox(step.requestCount) };
  const stepped = withFormStep(state, step);
  const afterRules = [
    saveStarted,
    takeFinished,
    updateSlice,
    withdrawFormNotices,
    clearOpeningsAway,
  ].reduce((next, rule) => rule(next, action, context), stepped);
  const requestCount = context.outbox.count();
  const next =
    requestCount === state.requestCount
      ? afterRules
      : { ...afterRules, requestCount };
  return updated(next, ...step.effects, ...context.outbox.effects());
};

/** The flashcards as a feature. */
export const flashcardsFeature: Feature<FlashcardsState> = {
  initialState: initialFlashcards,
  update: updateFlashcards,
};

function updateSlice(
  state: FlashcardsState,
  action: AppAction,
  context: FlashcardsContext,
): FlashcardsState {
  switch (action.type) {
    case "flashcardFieldsWritten":
      return fillWaitingCards(state, action.requestId, action.fields, context);
    case "flashcardLookupWaitEnded":
      return sendLateCard(state, action.flashcardId, context);
    case "failedSaveRetried":
      return retryFailedSave(state, action.flashcardId, context);
    case "allFailedSavesRetried":
      return retryAllFailedSaves(state, context);
    case "failedSaveOpened":
      return openFailedSave(state, action.flashcardId, context);
    case "failedSaveDiscarded":
      return discardFailedSave(state, action.flashcardId, context);
    case "failedSaveDiscardUndone":
      return restoreFailedSave(state, action.failedSave, context);
    case "saveUndoRequested":
      context.outbox.send(undoRequest(action.undo));
      return state;
    case "requestSettled":
      context.outbox.add(...fieldsAwaitedBy(action, state, context));
      return isFlashcardSettled(action)
        ? settleFlashcardRequest(state, action, context)
        : settleOpening(state, action, context);
    default:
      return state;
  }
}

/** Withdraws, as the screen closes, the undo toasts of closed forms, since their Undo needs the form. */
function withdrawFormNotices(
  state: FlashcardsState,
  action: AppAction,
  context: FlashcardsContext,
): FlashcardsState {
  if (!isLeavingScreen(context.app, action)) return state;
  for (const { key } of context.app.notices.shown)
    if (key?.startsWith(formDiscardedKeyPrefix))
      context.outbox.add(withdraw(key));
  return state;
}

/** Applies what left the form: cards to list, cards to wait for their lookup, and the failed save the form took. */
function withFormStep(state: FlashcardsState, step: FormStep): FlashcardsState {
  if (
    step.listed.length === 0 &&
    step.waiting.length === 0 &&
    step.taken === null
  )
    return state;
  const listed = step.listed.reduce(withFailedSave, state.failedSaves);
  const failedSaves =
    step.taken === null ? listed : withoutFailedSave(listed, step.taken);
  const waitingForLookup = [...state.waitingForLookup, ...step.waiting];
  return { ...state, failedSaves, waitingForLookup };
}
