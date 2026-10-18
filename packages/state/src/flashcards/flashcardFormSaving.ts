import { updated } from "../app/updated.ts";
import { selectShownMediaFile } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { isAborted } from "../server/isAborted.ts";
import type { EditorAction } from "./editFlashcard.ts";
import { keepFailedSave } from "./failedSaveCommands.ts";
import { editCard, flashcardIdOf, withLookupFields } from "./flashcardCard.ts";
import {
  type FlashcardApp,
  type FlashcardForm,
  isLocked,
  type Rollback,
} from "./flashcardForm.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { sendFlashcardRequest } from "./flashcardRequests.ts";
import { askSave, rollbackRequest } from "./flashcardSaves.ts";
import type { LookupFlashcardFields } from "./lookupFields.ts";
import type { FlashcardSettled } from "./settleFlashcardRequest.ts";
import { cancelLookupWait, startLookupWait } from "./waitingCards.ts";

/**
 * Applies the user's change to the open card, unless Save has been pressed.
 * Changing the word of a card awaiting its lookup gives the lookup up, since its definitions are those of another word.
 */
export function editForm(
  form: FlashcardForm,
  edit: EditorAction,
): FlashcardForm {
  if (isLocked(form.stage)) return form;
  const card = editCard(form.card, edit);
  const isWordChanged = edit.type === "textChanged" && edit.key === "word";
  return isWordChanged && form.lookup !== null
    ? { ...form, card, lookup: null, stage: "editing" }
    : { ...form, card };
}

/** Sends the open card's save, or, while its word's lookup is on its way, waits up to ten seconds for it. */
export function requestSave(form: FlashcardForm, app: FlashcardApp) {
  if (form.stage === "editing") return sendFromForm(form, app);
  if (form.stage !== "awaitingLookup") return updated(form);
  return updated(
    { ...form, stage: "awaitingLookupToSave", saveFailure: null },
    startLookupWait(flashcardIdOf(form.card)),
  );
}

/** Fills the card's untyped fields from its lookup's answer, and sends a save that waited for it. */
export function fillFromLookup(
  form: FlashcardForm,
  fields: LookupFlashcardFields | null,
  app: FlashcardApp,
) {
  const card =
    form.card.kind === "new" ? withLookupFields(form.card, fields) : form.card;
  const filled = { ...form, card, lookup: null };
  if (form.stage !== "awaitingLookupToSave")
    return updated({ ...filled, stage: "editing" });
  const [sent, effects] = sendFromForm(filled, app);
  return updated(sent, cancelLookupWait(flashcardIdOf(card)), ...effects);
}

/** Gives up the lookup a save waited for once the wait has run out, and sends the card as it is. */
export function giveUpLookup(form: FlashcardForm, app: FlashcardApp) {
  return form.stage === "awaitingLookupToSave"
    ? sendFromForm({ ...form, lookup: null }, app)
    : updated(form);
}

/**
 * Takes the outcome of a flashcard request into the form.
 * The form's own save or deletion closes it once it lands; a failed save unlocks it and says so,
 * and a save that ran out of time puts the card in doubt.
 * Any other request's success on the form's flashcard takes the card out of doubt, as does the failure of the Retry that put it there;
 * another save of it that runs out of time puts the card in doubt, unless it already is.
 * Another save of it that fails marks the card changed, since the form then holds edits saved nowhere.
 */
export function settleInForm(
  form: FlashcardForm,
  settled: FlashcardSettled,
): FlashcardForm | null {
  if (settled.id === form.sentRequestId) return settleOwn(form, settled);
  if (settled.request.flashcardId !== flashcardIdOf(form.card)) return form;
  if (settled.outcome.ok) return withRollback(form, null);
  const rollback = rollbackAfterFailure(form.rollbackIfDiscarded, settled);
  return withRollback(markedChanged(form, settled), rollback);
}

/**
 * Closes the form without saving, unless Save has been pressed.
 * A card whose save the user asked for failed is kept among the failed saves rather than dropped.
 * A changed card is discarded with an undo toast that reopens it, and a card in doubt takes back the save that may have landed.
 */
export function closeForm(form: FlashcardForm | null, app: FlashcardApp) {
  if (form === null || isLocked(form.stage)) return updated(form);
  const { card, rollbackIfDiscarded, saveFailure } = form;
  if (saveFailure !== null) {
    const failedCard = {
      card,
      projectId: selectShownMediaFile(app).projectId,
      rollbackIfDiscarded,
    };
    return updated(null, ...keepFailedSave(failedCard, saveFailure, app));
  }
  const rollback =
    rollbackIfDiscarded &&
    rollbackRequest(
      rollbackIfDiscarded,
      card,
      selectShownMediaFile(app).projectId,
    );
  const notices = discardNotices(card);
  if (!rollback) return updated(null, ...notices);
  return updated(null, ...notices, sendFlashcardRequest(rollback, app, "form"));
}

/** Deletes the open flashcard, or closes a new one at once, unless Save has been pressed. */
export function deleteFromForm(form: FlashcardForm, app: FlashcardApp) {
  if (isLocked(form.stage)) return updated(form);
  if (form.card.kind === "new") return updated(null);
  const flashcardId = flashcardIdOf(form.card);
  const sending = sendFlashcardRequest(
    {
      kind: "deleteFlashcard",
      projectId: selectShownMediaFile(app).projectId,
      flashcardId,
      purpose: { type: "delete" },
    },
    app,
    "form",
  );
  return updated(
    { ...form, sentRequestId: sending.id },
    withdraw(flashcardNoticeKeys.saveUndo(flashcardId)),
    sending,
  );
}

function sendFromForm(form: FlashcardForm, app: FlashcardApp) {
  const { card, rollbackIfDiscarded } = form;
  const { projectId } = selectShownMediaFile(app);
  const [withdrawal, sending] = askSave(
    { card, projectId, from: "form", offersUndo: true, rollbackIfDiscarded },
    app,
    "form",
  );
  return updated(
    { ...form, stage: "sending", sentRequestId: sending.id, saveFailure: null },
    withdrawal,
    sending,
  );
}

function settleOwn(
  form: FlashcardForm,
  { request, outcome }: FlashcardSettled,
): FlashcardForm | null {
  if (outcome.ok) return null;
  if (request.kind === "deleteFlashcard")
    return { ...form, sentRequestId: null };
  const before =
    request.purpose.type === "save" ? request.purpose.before : null;
  return {
    ...form,
    stage: "editing",
    sentRequestId: null,
    saveFailure: outcome.error,
    rollbackIfDiscarded:
      form.rollbackIfDiscarded ??
      (isAborted(outcome) ? { content: before, retryRequestId: null } : null),
  };
}

/**
 * The form's doubt after another request of its flashcard failed: begun by a save that ran out of time,
 * or ended by any other failure of the Retry that began it.
 * A waiting Retry aborted because an earlier save of the flashcard landed also counts as running out of time.
 * That doubt is harmless: the Retry was never sent, and what it would put back is what the saves ahead of it wrote.
 */
function rollbackAfterFailure(
  rollback: Rollback | null,
  settled: FlashcardSettled,
): Rollback | null {
  if (rollback === null) return doubtOf(settled);
  if (rollback.retryRequestId !== settled.id) return rollback;
  return isAborted(settled.outcome)
    ? { ...rollback, retryRequestId: null }
    : null;
}

function markedChanged(
  form: FlashcardForm,
  { request }: FlashcardSettled,
): FlashcardForm {
  const isCardSave =
    request.kind === "saveFlashcard" && request.purpose.type === "save";
  return isCardSave && !form.card.isChanged
    ? { ...form, card: { ...form.card, isChanged: true } }
    : form;
}

/** The doubt a failed save of the flashcard leaves when it ran out of time, and so may still land. */
function doubtOf({ request, outcome }: FlashcardSettled): Rollback | null {
  return !outcome.ok &&
    isAborted(outcome) &&
    request.kind === "saveFlashcard" &&
    request.purpose.type === "save"
    ? { content: request.purpose.before, retryRequestId: null }
    : null;
}

function withRollback(
  form: FlashcardForm,
  rollbackIfDiscarded: Rollback | null,
): FlashcardForm {
  return form.rollbackIfDiscarded === rollbackIfDiscarded
    ? form
    : { ...form, rollbackIfDiscarded };
}

/** Returns the undo toast of a discarded card, which only a changed card needs. */
function discardNotices(card: FlashcardForm["card"]) {
  if (!card.isChanged) return [];
  return [show(flashcardNotices.formDiscarded(card))];
}
