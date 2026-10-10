import { createFailedSave } from "./failedSave.ts";
import { noticeOfListing } from "./failedSaveListing.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { rollbackRequest } from "./flashcardSaves.ts";
import type { FormContext } from "./formStep.ts";
import { isLocked } from "./saveStage.ts";

/**
 * Closes the form without saving, unless Save has been pressed.
 * A card whose save the user asked for failed is listed among the failed saves rather than dropped.
 * A changed card is discarded with an undo toast that reopens it, and a card in doubt takes back the save that may have landed.
 */
export function closeForm(
  form: FlashcardForm | null,
  { route, step }: FormContext,
): FlashcardForm | null {
  if (form === null || isLocked(form.stage)) return form;
  const { card, rollbackIfDiscarded, saveFailure } = form;
  if (saveFailure !== null) {
    const isRefused = saveFailure === "refused";
    const failedSave = createFailedSave(
      card,
      route.projectId,
      isRefused,
      rollbackIfDiscarded,
    );
    step.list(failedSave);
    step.outbox.add(noticeOfListing(failedSave));
    return null;
  }
  if (card.isChanged)
    step.outbox.add(show(flashcardNotices.formDiscarded(card)));
  if (rollbackIfDiscarded)
    step.outbox.send(
      rollbackRequest(rollbackIfDiscarded, card, route.projectId),
    );
  return null;
}

/** Deletes the open flashcard, or closes a new one at once, unless Save has been pressed. */
export function deleteFromForm(
  form: FlashcardForm,
  { route, step }: FormContext,
): FlashcardForm | null {
  if (isLocked(form.stage)) return form;
  if (form.card.kind === "new") return null;
  const flashcardId = flashcardIdOf(form.card);
  step.outbox.add(withdraw(flashcardNoticeKeys.saveUndo(flashcardId)));
  const sentRequestId = step.outbox.send({
    kind: "deleteFlashcard",
    projectId: route.projectId,
    flashcardId,
    purpose: { type: "delete" },
  });
  return { ...form, sentRequestId };
}
