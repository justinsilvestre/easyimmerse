import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { updated } from "../app/updated.ts";
import type { MediaRoute } from "../route/route.ts";
import { lookupFlashcardFinishedBy } from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { picturesFoundBy } from "../screen/mediaScreen/picturesProbe.ts";
import { findFailedSave } from "./failedSave.ts";
import {
  openingProgress,
  openingSettledBy,
} from "./failedSaveOpeningRequests.ts";
import { newCard, withScreenshot } from "./flashcardCard.ts";
import { type FlashcardForm, openedForm } from "./flashcardForm.ts";
import { flashcardStartedBy } from "./flashcardStartedBy.ts";
import { isLeavingScreen } from "./flashcardsOnScreen.ts";
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
import { isCardOf } from "./latestFlashcard.ts";
import { isFlashcardSettled } from "./settleFlashcardRequest.ts";

/**
 * Updates the flashcard-editing form of the media screen, returning with it the requests and notices it asks for,
 * and the announcement of any card it opens. `app` is the state before the action.
 */
export function updateFlashcardForm(
  form: FlashcardForm | null,
  action: AppAction,
  app: AppState,
  route: MediaRoute,
) {
  const { projectId } = route;
  if (isLeavingScreen(app, action))
    return updated(null, ...leaveForm(form, app, projectId));
  const finished = lookupFlashcardFinishedBy(app, action);
  if (
    finished?.pending.destination === "editor" &&
    finished.how !== "abandoned"
  )
    return replaceForm(form, formFromLookup(finished), app, projectId);
  if (picturesFoundBy(action, route, app)) return updated(withPictures(form));
  const started = flashcardStartedBy(action);
  if (started)
    return started.destination === "editor"
      ? replaceForm(
          form,
          openedForm(newCard(started.flashcard)),
          app,
          projectId,
        )
      : updated(form);
  switch (action.type) {
    case "flashcardOpened":
      return openListed(form, action, app, projectId);
    case "formDiscardUndone":
      return replaceForm(form, restoredForm(action.card), app, projectId);
    case "flashcardEdited":
      return updated(form && editForm(form, action.edit));
    case "flashcardSaveRequested":
      return form ? requestSave(form, app, projectId) : updated(form);
    case "flashcardClosed":
      return closeForm(form, app, projectId);
    case "flashcardDeleteRequested":
      return form ? deleteFromForm(form, app, projectId) : updated(form);
    case "flashcardFieldsWritten":
      return form?.lookup?.requestId === action.requestId
        ? fillFromLookup(form, action.fields, app, projectId)
        : updated(form);
    case "flashcardLookupWaitEnded":
      return form && isCardOf(form.card, action.flashcardId)
        ? giveUpLookup(form, app, projectId)
        : updated(form);
    case "requestSettled":
      return settled(form, action, app, route);
    default:
      return updated(form);
  }
}

/** Takes the outcome of a flashcard request, or of the last of the requests on the way to opening a failed save here. */
function settled(
  form: FlashcardForm | null,
  action: AppAction,
  app: AppState,
  route: MediaRoute,
) {
  if (isFlashcardSettled(action))
    return updated(form && settleInForm(form, action));
  const opening = openingSettledBy(action);
  const failedSave = opening && findFailedSave(app, opening.flashcardId);
  return opening &&
    failedSave?.isOpening &&
    failedSave.mediaFileId === route.mediaFileId &&
    openingProgress(opening, failedSave, app) === "ready"
    ? takeFailedSave(form, failedSave, app, route.projectId)
    : updated(form);
}

/** Gives a new card started before the file was known to show pictures its screenshot, unless its save is under way. */
function withPictures(form: FlashcardForm | null): FlashcardForm | null {
  if (form?.card.kind !== "new" || form.stage === "sending") return form;
  const card = withScreenshot(form.card);
  return card === form.card ? form : { ...form, card };
}
