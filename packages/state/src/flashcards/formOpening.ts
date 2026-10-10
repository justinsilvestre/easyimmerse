import type { Flashcard } from "@easyimmerse/types";
import type { FinishedLookupFlashcard } from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import {
  existingCard,
  type FlashcardCard,
  newCard,
  withLookupFields,
} from "./flashcardCard.ts";
import {
  type FlashcardForm,
  openedForm,
  type Rollback,
} from "./flashcardForm.ts";
import { flashcardNoticeKeys, withdraw } from "./flashcardNotices.ts";
import type { FormContext } from "./formContext.ts";
import { replaceForm } from "./formLeaving.ts";
import { latestFlashcard, retryOf } from "./latestFlashcard.ts";

/** The form for a flashcard from a word: filled from its lookup when that answered in time, or else awaiting it. */
export function formFromLookup({
  pending,
  how,
  fields,
}: FinishedLookupFlashcard): FlashcardForm {
  const card = newCard({ id: pending.flashcardId, draft: pending.draft });
  if (how === "ready") return openedForm(withLookupFields(card, fields));
  const lookup = {
    requestId: lookupRequestId(pending.sequence),
    context: pending.context,
  };
  return { ...openedForm(card), stage: "awaitingLookup", lookup };
}

/**
 * Opens a flashcard of the list as the latest work on it leaves it, withdrawing the Undo of its last save,
 * since undoing it now would change the card under the form. A failed save of the flashcard opens instead, with its edits.
 */
export function openListed(
  form: FlashcardForm | null,
  listed: Flashcard,
  context: FormContext,
): FlashcardForm {
  const failedSave = context.app.flashcards.failedSaves.find(
    (each) => failedSaveIdOf(each) === listed.id,
  );
  if (failedSave) return takeFailedSave(form, failedSave, context);
  context.step.outbox.add(withdraw(flashcardNoticeKeys.saveUndo(listed.id)));
  const card = existingCard(latestFlashcard(listed, context.app));
  return replaceForm(form, openedForm(card), context);
}

/**
 * Opens a failed save with its edits, which count as changed since they are saved nowhere, and takes it off the list.
 * During its Retry, the card is in doubt until the Retry settles, so that discarding it takes the Retry back.
 */
export function takeFailedSave(
  form: FlashcardForm | null,
  failedSave: FailedSave,
  context: FormContext,
): FlashcardForm {
  const flashcardId = failedSaveIdOf(failedSave);
  context.step.take(flashcardId);
  context.step.outbox.add(
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    withdraw(flashcardNoticeKeys.saveUndo(flashcardId)),
  );
  const retry = retryOf(context.app, flashcardId);
  const rollback: Rollback | null =
    retry?.request.kind === "saveFlashcard" &&
    retry.request.purpose.type === "save"
      ? { content: retry.request.purpose.before, retryRequestId: retry.id }
      : failedSave.rollbackIfDiscarded;
  return replaceForm(form, restoredForm(failedSave.card, rollback), context);
}

/** The form on a card brought back with its edits, which count as changed since they are saved nowhere. */
export function restoredForm(
  card: FlashcardCard,
  rollback: Rollback | null = null,
): FlashcardForm {
  return openedForm({ ...card, isChanged: true }, rollback);
}
