import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import {
  failedSaveIdOf,
  failedSaveKeptId,
  isSaveRefused,
  selectFailedSave,
  selectFailedSaves,
  selectKeptFailedSave,
  selectPendingRetry,
} from "./failedSave.ts";
import { flashcardIdOf, isCardOf, mediaFileIdOf } from "./flashcardCard.ts";
import type { FlashcardApp } from "./flashcardForm.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { sendFlashcardRequest } from "./flashcardRequests.ts";
import {
  askSave,
  rollbackRequest,
  type SaveOrder,
  saveRequest,
} from "./flashcardSaves.ts";

/** A card whose save failed, with the doubt it carries. */
export type FailedCard = Pick<
  SaveOrder,
  "card" | "projectId" | "rollbackIfDiscarded"
>;

/**
 * Keeps the failed save of a card, in place of any kept for its flashcard: the save a Retry sends, and how the last save failed.
 * A refused save shows its own notice; any other withdraws an earlier one.
 */
export function keepFailedSave(
  failedCard: FailedCard,
  failure: RequestFailure,
  app: Pick<AppState, "operations">,
) {
  const order = { ...failedCard, from: "retry", offersUndo: false } as const;
  const kept = {
    id: failedSaveKeptId(flashcardIdOf(failedCard.card)),
    request: saveRequest(order, app),
    failure,
  } satisfies FailedRequest;
  return [
    { type: "keepFailedRequest", failed: kept },
    noticeOfKeeping(failedCard, failure),
  ] satisfies Effect[];
}

/**
 * Sends a failed save again, unless it was refused or its Retry is under way.
 * The failed save stays kept until the Retry lands, and an opening under way goes on, so that it still opens if the Retry fails.
 */
export function retryFailedSave(
  flashcardId: string,
  app: Pick<AppState, "operations">,
) {
  const failedSave = selectFailedSave(app, flashcardId);
  if (
    !failedSave ||
    failedSave.isRefused ||
    selectPendingRetry(app, flashcardId)
  )
    return [];
  const { card, projectId, rollbackIfDiscarded } = failedSave;
  return askSave(
    { card, projectId, from: "retry", offersUndo: false, rollbackIfDiscarded },
    app,
    "background",
  );
}

/** Sends every failed save again, as `retryFailedSave` does. */
export function retryAllFailedSaves(app: Pick<AppState, "operations">) {
  return selectFailedSaves(app).flatMap((failedSave) =>
    retryFailedSave(failedSaveIdOf(failedSave), app),
  );
}

/**
 * Throws a failed save's edits away, with an undo toast that keeps it again, and takes back a save of it in doubt.
 * It does nothing while a Retry of the card is under way.
 */
export function discardFailedSave(flashcardId: string, app: FlashcardApp) {
  const failedSave = selectFailedSave(app, flashcardId);
  if (!failedSave || selectPendingRetry(app, flashcardId)) return [];
  const { card, projectId, rollbackIfDiscarded, kept } = failedSave;
  const rollback =
    rollbackIfDiscarded &&
    rollbackRequest(rollbackIfDiscarded, card, projectId);
  const discarding = [
    forgetFailedSave(flashcardId),
    withdraw(flashcardNoticeKeys.saveRefused(flashcardId)),
    show(
      flashcardNotices.failedSaveDiscarded({
        ...failedSave,
        kept: withoutDoubt(kept),
      }),
    ),
  ];
  if (!rollback) return discarding;
  return [...discarding, sendFlashcardRequest(rollback, app, "background")];
}

/** Keeps a discarded failed save again, unless the form holds its flashcard meanwhile, whose copy is then the newer one. */
export function restoreFailedSave(kept: FailedRequest, app: FlashcardApp) {
  const failedSave = selectKeptFailedSave(app, kept);
  const form = selectFlashcardForm(app);
  if (failedSave === null) return [];
  if (form && isCardOf(form.card, failedSaveIdOf(failedSave))) return [];
  return [keepAgain(kept)];
}

/** Forgets the failed save of a flashcard. */
export function forgetFailedSave(flashcardId: string) {
  return {
    type: "forgetFailedRequest",
    id: failedSaveKeptId(flashcardId),
  } satisfies Effect;
}

function keepAgain(kept: FailedRequest) {
  return { type: "keepFailedRequest", failed: kept } satisfies Effect;
}

function noticeOfKeeping(
  { card, projectId }: FailedCard,
  failure: RequestFailure,
) {
  return isSaveRefused(failure)
    ? show(
        flashcardNotices.saveRefused({
          card,
          projectId,
          mediaFileId: mediaFileIdOf(card),
        }),
      )
    : withdraw(flashcardNoticeKeys.saveRefused(flashcardIdOf(card)));
}

/** A kept save whose doubt is gone, as once the rollback that discarding it sent has taken the save back. */
function withoutDoubt(kept: FailedRequest): FailedRequest {
  const { request } = kept;
  if (request.kind !== "saveFlashcard" || request.purpose.type !== "save")
    return kept;
  const purpose = { ...request.purpose, rollbackIfDiscarded: null };
  return { ...kept, request: { ...request, purpose } };
}
