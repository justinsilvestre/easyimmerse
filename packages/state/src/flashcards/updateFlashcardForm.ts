import type { Flashcard } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import { updated } from "../app/updated.ts";
import {
  type FinishedLookupFlashcard,
  lookupFlashcardFinishedBy,
} from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import {
  selectShownMediaFile,
  selectShownMediaScreen,
} from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { picturesFoundBy } from "../screen/mediaScreen/picturesProbe.ts";
import {
  type FailedSave,
  failedSaveIdOf,
  selectFailedSave,
  selectPendingRetry,
} from "./failedSave.ts";
import { forgetFailedSave } from "./failedSaveCommands.ts";
import { openingProgress, openingSettledBy } from "./failedSaveOpening.ts";
import { flashcardActions } from "./flashcardActions.ts";
import {
  existingCard,
  type FlashcardCard,
  isCardOf,
  newCard,
  withLookupFields,
  withScreenshot,
} from "./flashcardCard.ts";
import {
  type FlashcardApp,
  type FlashcardForm,
  isAwaitingLookup,
  openedForm,
  type Rollback,
} from "./flashcardForm.ts";
import {
  closeForm,
  deleteFromForm,
  editForm,
  fillFromLookup,
  giveUpLookup,
  requestSave,
  settleInForm,
} from "./flashcardFormSaving.ts";
import { flashcardNoticeKeys, withdraw } from "./flashcardNotices.ts";
import { askSave } from "./flashcardSaves.ts";
import { selectLatestFlashcard } from "./flashcardsSelectors.ts";
import { isFlashcardSettled } from "./settleFlashcardRequest.ts";
import { flashcardStartedBy } from "./startedCards.ts";
import { holdForLookup, startLookupWait } from "./waitingCards.ts";

/** The slices of the app state that the form reads: the flashcard rules' slices, and the server's capabilities for pictures. */
type FlashcardFormApp = FlashcardApp & Pick<AppState, "server">;

/**
 * Updates the flashcard-editing form of the media screen, returning with it the requests and notices it asks for,
 * and the announcement of any card it opens.
 */
export function updateFlashcardForm(
  form: FlashcardForm | null,
  action: AppAction,
  app: FlashcardFormApp,
) {
  if (action.type === "mediaScreenLeft")
    return updated(null, ...leaveForm(form, app));
  const { lookup } = selectShownMediaScreen(app);
  const finished = lookupFlashcardFinishedBy(lookup, action);
  if (
    finished?.pending.destination === "editor" &&
    finished.how !== "abandoned"
  )
    return replaceForm(form, formFromLookup(finished), app);
  if (picturesFoundBy(action, app)) return updated(withPictures(form));
  const started = flashcardStartedBy(lookup, action);
  if (started)
    return started.destination === "editor"
      ? replaceForm(form, openedForm(newCard(started.flashcard)), app)
      : updated(form);
  switch (action.type) {
    case "flashcardOpened":
      return openListed(form, action, app);
    case "formDiscardUndone":
      return replaceForm(form, restoredForm(action.card), app);
    case "flashcardEdited":
      return updated(form && editForm(form, action.edit));
    case "flashcardSaveRequested":
      return form ? requestSave(form, app) : updated(form);
    case "flashcardClosed":
      return closeForm(form, app);
    case "flashcardDeleteRequested":
      return form ? deleteFromForm(form, app) : updated(form);
    case "flashcardFieldsWritten":
      return form?.lookup?.requestId === action.requestId
        ? fillFromLookup(form, action.fields, app)
        : updated(form);
    case "flashcardLookupWaitEnded":
      return form && isCardOf(form.card, action.flashcardId)
        ? giveUpLookup(form, app)
        : updated(form);
    case "requestSettled":
      return settled(form, action, app);
    default:
      return updated(form);
  }
}

/** Takes the outcome of a flashcard request, or of the last of the requests on the way to opening a failed save here. */
function settled(
  form: FlashcardForm | null,
  action: AppAction,
  app: FlashcardFormApp,
) {
  if (isFlashcardSettled(action))
    return updated(form && settleInForm(form, action));
  const opening = openingSettledBy(action);
  const failedSave = opening && selectFailedSave(app, opening.flashcardId);
  return opening &&
    failedSave?.isOpening &&
    failedSave.mediaFileId === selectShownMediaFile(app).mediaFileId &&
    openingProgress(opening, failedSave, app) === "ready"
    ? takeFailedSave(form, failedSave, app)
    : updated(form);
}

/** Opens the form on another card, after the card it held has left as `leaveForm` describes. */
function replaceForm(
  form: FlashcardForm | null,
  next: FlashcardForm,
  app: FlashcardApp,
) {
  const { audio_context } = next.card.editor.content;
  return updated(
    next,
    ...leaveForm(form, app),
    dispatch(flashcardActions.flashcardFormOpened(audio_context)),
  );
}

/**
 * Returns what becomes of the card a form leaves as another card opens or the screen closes.
 * A card being sent, and an unchanged saved card, are left alone. A card waiting for its word's lookup keeps waiting,
 * within the ten seconds counted from Save when it was pressed, or from now. Any other card is saved in the background,
 * with an undo toast once it lands.
 */
function leaveForm(form: FlashcardForm | null, app: FlashcardApp) {
  if (form === null || form.stage === "sending") return [];
  const { card, rollbackIfDiscarded } = form;
  const { projectId } = selectShownMediaFile(app);
  if (card.kind === "existing" && !card.isChanged && form.stage === "editing")
    return [];
  if (isAwaitingLookup(form.stage) && card.kind === "new" && form.lookup) {
    const isSaveAsked = form.stage === "awaitingLookupToSave";
    const waiting = {
      card,
      lookup: form.lookup,
      offersUndo: !isSaveAsked,
    };
    const holding = holdForLookup(waiting, app, "form");
    if (isSaveAsked) return holding;
    return [...holding, startLookupWait(card.flashcardId)];
  }
  const from = "background";
  return askSave(
    { card, projectId, from, offersUndo: true, rollbackIfDiscarded },
    app,
    "form",
  );
}

/** The form for a flashcard from a word: filled from its lookup when that answered in time, or else awaiting it. */
function formFromLookup({
  pending,
  how,
  fields,
}: FinishedLookupFlashcard): FlashcardForm {
  const card = newCard({ id: pending.flashcardId, draft: pending.draft });
  if (how === "ready") return openedForm(withLookupFields(card, fields));
  const lookup = {
    requestId: lookupRequestId(pending.flashcardId),
    context: pending.context,
  };
  return { ...openedForm(card), stage: "awaitingLookup", lookup };
}

/**
 * Opens a flashcard of the list as the latest work on it leaves it, withdrawing the Undo of its last save,
 * since undoing it now would change the card under the form. A failed save of the flashcard opens instead, with its edits,
 * whether or not the list has the flashcard.
 */
function openListed(
  form: FlashcardForm | null,
  { flashcardId, listed }: { flashcardId: string; listed: Flashcard | null },
  app: FlashcardApp,
) {
  const failedSave = selectFailedSave(app, flashcardId);
  if (failedSave) return takeFailedSave(form, failedSave, app);
  if (listed === null) return updated(form);
  const card = existingCard(selectLatestFlashcard(app, listed));
  const [opened, effects] = replaceForm(form, openedForm(card), app);
  return updated(
    opened,
    withdraw(flashcardNoticeKeys.saveUndo(listed.id)),
    ...effects,
  );
}

/**
 * Opens a failed save with its edits, and forgets it.
 * During its Retry, the card is in doubt until the Retry settles, so that discarding it takes the Retry back.
 */
function takeFailedSave(
  form: FlashcardForm | null,
  failedSave: FailedSave,
  app: FlashcardApp,
) {
  const flashcardId = failedSaveIdOf(failedSave);
  const retry = selectPendingRetry(app, flashcardId);
  const rollback: Rollback | null =
    retry?.request.kind === "saveFlashcard" &&
    retry.request.purpose.type === "save"
      ? { content: retry.request.purpose.before, retryRequestId: retry.id }
      : failedSave.rollbackIfDiscarded;
  const restored = restoredForm(failedSave.card, rollback);
  const [opened, effects] = replaceForm(form, restored, app);
  return updated(
    opened,
    forgetFailedSave(flashcardId),
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    withdraw(flashcardNoticeKeys.saveUndo(flashcardId)),
    ...effects,
  );
}

/** The form on a card brought back with its edits, which count as changed since they are saved nowhere. */
function restoredForm(
  card: FlashcardCard,
  rollback: Rollback | null = null,
): FlashcardForm {
  return openedForm({ ...card, isChanged: true }, rollback);
}

/** Gives a new card started before the file was known to show pictures its screenshot, unless its save is under way. */
function withPictures(form: FlashcardForm | null): FlashcardForm | null {
  if (form?.card.kind !== "new" || form.stage === "sending") return form;
  const card = withScreenshot(form.card);
  return card === form.card ? form : { ...form, card };
}
