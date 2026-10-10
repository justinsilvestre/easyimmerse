import type { AppState } from "../app/appState.ts";
import { updated } from "../app/updated.ts";
import { keepFailedSave } from "./failedSaveKeeping.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { sendFlashcardRequest } from "./flashcardRequests.ts";
import { rollbackRequest } from "./flashcardSaves.ts";
import { isLocked } from "./saveStage.ts";

/**
 * Closes the form without saving, unless Save has been pressed.
 * A card whose save the user asked for failed is kept among the failed saves rather than dropped.
 * A changed card is discarded with an undo toast that reopens it, and a card in doubt takes back the save that may have landed.
 */
export function closeForm(
  form: FlashcardForm | null,
  app: AppState,
  projectId: string,
) {
  if (form === null || isLocked(form.stage)) return updated(form);
  const { card, rollbackIfDiscarded, saveFailure } = form;
  if (saveFailure !== null) {
    const failedCard = { card, projectId, rollbackIfDiscarded };
    return updated(null, ...keepFailedSave(failedCard, saveFailure, app));
  }
  const rollback =
    rollbackIfDiscarded &&
    rollbackRequest(rollbackIfDiscarded, card, projectId);
  return updated(
    null,
    ...(card.isChanged ? [show(flashcardNotices.formDiscarded(card))] : []),
    ...(rollback ? [sendFlashcardRequest(rollback, app, "form")] : []),
  );
}

/** Deletes the open flashcard, or closes a new one at once, unless Save has been pressed. */
export function deleteFromForm(
  form: FlashcardForm,
  app: AppState,
  projectId: string,
) {
  if (isLocked(form.stage)) return updated(form);
  if (form.card.kind === "new") return updated(null);
  const flashcardId = flashcardIdOf(form.card);
  const sending = sendFlashcardRequest(
    {
      kind: "deleteFlashcard",
      projectId,
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
