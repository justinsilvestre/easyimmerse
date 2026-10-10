import { updated } from "../app/updated.ts";
import { selectShownMediaFile } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { EditorAction } from "./editFlashcard.ts";
import type { FlashcardApp } from "./flashcardApp.ts";
import { editCard, flashcardIdOf, withLookupFields } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { askSave } from "./flashcardSaves.ts";
import type { LookupFlashcardFields } from "./lookupFields.ts";
import { cancelLookupWait, startLookupWait } from "./lookupWait.ts";
import { isLocked } from "./saveStage.ts";

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
