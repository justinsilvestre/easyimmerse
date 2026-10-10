import { isAborted } from "../server/isAborted.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import type { FlashcardForm, Rollback } from "./flashcardForm.ts";
import type { FlashcardSettled } from "./flashcardSettled.ts";
import { isSaveRefused } from "./isSaveRefused.ts";

/**
 * Takes the outcome of a flashcard request into the form.
 * The form's own save or deletion closes it once it lands; a failed save unlocks it and says so,
 * and a save that ran out of time puts the card in doubt.
 * Any other request's success on the form's flashcard takes the card out of doubt, as does the failure of the Retry that put it there;
 * another save of it that runs out of time puts the card in doubt, unless it already is.
 */
export function settleInForm(
  form: FlashcardForm,
  settled: FlashcardSettled,
): FlashcardForm | null {
  if (settled.id === form.sentRequestId) return settleOwn(form, settled);
  if (settled.request.flashcardId !== flashcardIdOf(form.card)) return form;
  if (settled.outcome.ok) return withRollback(form, null);
  const rollback = form.rollbackIfDiscarded;
  if (rollback === null) return withRollback(form, doubtOf(settled));
  if (rollback.retryRequestId !== settled.id) return form;
  return withRollback(
    form,
    isAborted(settled.outcome) ? { ...rollback, retryRequestId: null } : null,
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
    saveFailure: isSaveRefused(outcome.error) ? "refused" : "failed",
    rollbackIfDiscarded:
      form.rollbackIfDiscarded ??
      (isAborted(outcome) ? { content: before, retryRequestId: null } : null),
  };
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
