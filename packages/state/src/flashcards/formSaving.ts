import type { EditorAction } from "./editFlashcard.ts";
import { editCard, flashcardIdOf, withLookupFields } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { askSave } from "./flashcardSaves.ts";
import type { FormContext } from "./formStep.ts";
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
export function requestSave(
  form: FlashcardForm,
  context: FormContext,
): FlashcardForm {
  if (form.stage === "editing") return sendFromForm(form, context);
  if (form.stage !== "awaitingLookup") return form;
  context.step.outbox.add(startLookupWait(flashcardIdOf(form.card)));
  return { ...form, stage: "awaitingLookupToSave", saveFailure: null };
}

/** Fills the card's untyped fields from its lookup's answer, and sends a save that waited for it. */
export function fillFromLookup(
  form: FlashcardForm,
  fields: LookupFlashcardFields | null,
  context: FormContext,
): FlashcardForm {
  const card =
    form.card.kind === "new" ? withLookupFields(form.card, fields) : form.card;
  const filled = { ...form, card, lookup: null };
  if (form.stage !== "awaitingLookupToSave")
    return { ...filled, stage: "editing" };
  context.step.outbox.add(cancelLookupWait(flashcardIdOf(card)));
  return sendFromForm(filled, context);
}

/** Gives up the lookup a save waited for once the wait has run out, and sends the card as it is. */
export function giveUpLookup(
  form: FlashcardForm,
  context: FormContext,
): FlashcardForm {
  return form.stage === "awaitingLookupToSave"
    ? sendFromForm({ ...form, lookup: null }, context)
    : form;
}

function sendFromForm(
  form: FlashcardForm,
  { app, route, step }: FormContext,
): FlashcardForm {
  const { card, rollbackIfDiscarded } = form;
  const { projectId } = route;
  const sentRequestId = askSave(
    { card, projectId, from: "form", offersUndo: true, rollbackIfDiscarded },
    app,
    step.outbox,
  );
  return { ...form, stage: "sending", sentRequestId, saveFailure: null };
}
