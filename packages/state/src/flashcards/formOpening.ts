import type { Flashcard } from "@easyimmerse/types";
import { updated } from "../app/updated.ts";
import type { FinishedLookupFlashcard } from "../screen/lookup/lookupFlashcardFinishedBy.ts";
import { lookupRequestId } from "../screen/lookup/lookupIds.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import { forgetFailedSave } from "./failedSaveKeeping.ts";
import { selectFailedSave, selectPendingRetry } from "./failedSaveSelectors.ts";
import type { FlashcardApp } from "./flashcardApp.ts";
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
import { selectLatestFlashcard } from "./flashcardsSelectors.ts";
import { replaceForm } from "./formLeaving.ts";

/** The form for a flashcard from a word: filled from its lookup when that answered in time, or else awaiting it. */
export function formFromLookup({
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
export function openListed(
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
 * Opens a failed save with its edits, which count as changed since they are saved nowhere, and forgets it.
 * During its Retry, the card is in doubt until the Retry settles, so that discarding it takes the Retry back.
 */
export function takeFailedSave(
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
export function restoredForm(
  card: FlashcardCard,
  rollback: Rollback | null = null,
): FlashcardForm {
  return openedForm({ ...card, isChanged: true }, rollback);
}
