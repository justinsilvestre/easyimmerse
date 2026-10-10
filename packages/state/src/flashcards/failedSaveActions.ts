import type { AppState } from "../app/appState.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { failedSaveIdOf } from "./failedSave.ts";
import { forgetFailedSave, keepAgain } from "./failedSaveKeeping.ts";
import {
  selectFailedSave,
  selectKeptFailedSave,
  selectPendingRetry,
} from "./failedSaveSelectors.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { sendFlashcardRequest } from "./flashcardRequests.ts";
import { rollbackRequest } from "./flashcardSaves.ts";
import { isCardOf } from "./latestFlashcard.ts";

/**
 * Throws a failed save's edits away, with an undo toast that keeps it again, and takes back a save of it in doubt.
 * It does nothing while a Retry of the card is under way.
 */
export function discardFailedSave(flashcardId: string, app: AppState) {
  const failedSave = selectFailedSave(app, flashcardId);
  if (!failedSave || selectPendingRetry(app, flashcardId)) return [];
  const { card, projectId, rollbackIfDiscarded, kept } = failedSave;
  const rollback =
    rollbackIfDiscarded &&
    rollbackRequest(rollbackIfDiscarded, card, projectId);
  return [
    forgetFailedSave(flashcardId),
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    show(
      flashcardNotices.failedSaveDiscarded({
        ...failedSave,
        kept: withoutDoubt(kept),
      }),
    ),
    ...(rollback ? [sendFlashcardRequest(rollback, app, "background")] : []),
  ];
}

/** Keeps a discarded failed save again, unless the form holds its flashcard meanwhile, whose copy is then the newer one. */
export function restoreFailedSave(kept: FailedRequest, app: AppState) {
  const failedSave = selectKeptFailedSave(app, kept);
  const form = selectFlashcardForm(app);
  if (failedSave === null) return [];
  if (form && isCardOf(form.card, failedSaveIdOf(failedSave))) return [];
  return [keepAgain(kept)];
}

/** A kept save whose doubt is gone, as once the rollback that discarding it sent has taken the save back. */
function withoutDoubt(kept: FailedRequest): FailedRequest {
  const { request } = kept;
  if (request.kind !== "saveFlashcard" || request.purpose.type !== "save")
    return kept;
  const purpose = { ...request.purpose, rollbackIfDiscarded: null };
  return { ...kept, request: { ...request, purpose } };
}
