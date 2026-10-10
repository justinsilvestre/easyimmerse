import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { lookupFlashcardFinishedBy } from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { picturesFoundBy } from "../screen/mediaScreen/picturesProbe.ts";
import { failedSaveIdOf } from "./failedSave.ts";
import {
  openingProgress,
  openingSettledBy,
} from "./failedSaveOpeningRequests.ts";
import { newCard, withScreenshot } from "./flashcardCard.ts";
import { type FlashcardForm, openedForm } from "./flashcardForm.ts";
import { flashcardStartedBy } from "./flashcardStartedBy.ts";
import { isLeavingScreen, mediaScreenOf } from "./flashcardsOnScreen.ts";
import { closeForm, deleteFromForm } from "./formClosing.ts";
import { leaveForm, replaceForm } from "./formLeaving.ts";
import {
  formFromLookup,
  openListed,
  restoredForm,
  takeFailedSave,
} from "./formOpening.ts";
import {
  editForm,
  fillFromLookup,
  giveUpLookup,
  requestSave,
} from "./formSaving.ts";
import { settleInForm } from "./formSettling.ts";
import type { FormContext } from "./formStep.ts";
import { createFormStep, type FormStep } from "./formStep.ts";
import { isCardOf } from "./latestFlashcard.ts";
import { isFlashcardSettled } from "./settleFlashcardRequest.ts";

/**
 * Steps the flashcard-editing form of the open media screen or reader through an action, and returns the next form
 * with what left it. The media screen keeps the form; the flashcards feature takes up the rest, so that the two cannot disagree.
 * `app` is the state before the action.
 */
export function stepFlashcardForm(app: AppState, action: AppAction): FormStep {
  const step = createFormStep(app.flashcards.requestCount);
  const onScreen = mediaScreenOf(app);
  if (onScreen === null) return step.finish(null);
  const context = { app, route: onScreen.route, step };
  return step.finish(nextForm(onScreen.screen.flashcardForm, action, context));
}

function nextForm(
  form: FlashcardForm | null,
  action: AppAction,
  context: FormContext,
): FlashcardForm | null {
  const { app, route } = context;
  if (isLeavingScreen(app, action)) {
    leaveForm(form, context);
    return null;
  }
  const finished = lookupFlashcardFinishedBy(app, action);
  if (
    finished?.pending.destination === "editor" &&
    finished.how !== "abandoned"
  )
    return replaceForm(form, formFromLookup(finished), context);
  if (picturesFoundBy(action, route, app)) return withPictures(form);
  const started = flashcardStartedBy(app, action);
  if (started)
    return started.destination === "editor"
      ? replaceForm(form, openedForm(newCard(started.flashcard)), context)
      : form;
  switch (action.type) {
    case "flashcardOpened":
      return openListed(form, action, context);
    case "formDiscardUndone":
      return replaceForm(form, restoredForm(action.card), context);
    case "flashcardEdited":
      return form && editForm(form, action.edit);
    case "flashcardSaveRequested":
      return form && requestSave(form, context);
    case "flashcardClosed":
      return closeForm(form, context);
    case "flashcardDeleteRequested":
      return form && deleteFromForm(form, context);
    case "flashcardFieldsWritten":
      return form?.lookup?.requestId === action.requestId
        ? fillFromLookup(form, action.fields, context)
        : form;
    case "flashcardLookupWaitEnded":
      return form && isCardOf(form.card, action.flashcardId)
        ? giveUpLookup(form, context)
        : form;
    case "requestSettled":
      return settled(form, action, context);
    default:
      return form;
  }
}

/** Takes the outcome of a flashcard request, or of the last of the requests on the way to opening a failed save here. */
function settled(
  form: FlashcardForm | null,
  action: AppAction,
  context: FormContext,
): FlashcardForm | null {
  if (isFlashcardSettled(action)) return form && settleInForm(form, action);
  const opening = openingSettledBy(action);
  const failedSave = context.app.flashcards.failedSaves.find(
    (each) => failedSaveIdOf(each) === opening?.flashcardId,
  );
  return opening &&
    failedSave?.isOpening &&
    failedSave.mediaFileId === context.route.mediaFileId &&
    openingProgress(opening, failedSave, context.app) === "ready"
    ? takeFailedSave(form, failedSave, context)
    : form;
}

/** Gives a new card started before the file was known to show pictures its screenshot, unless its save is under way. */
function withPictures(form: FlashcardForm | null): FlashcardForm | null {
  if (form?.card.kind !== "new" || form.stage === "sending") return form;
  const card = withScreenshot(form.card);
  return card === form.card ? form : { ...form, card };
}
