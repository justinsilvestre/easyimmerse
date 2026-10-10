import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import { failedSaveKeptId } from "./failedSave.ts";
import { flashcardIdOf, mediaFileIdOf } from "./flashcardCard.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import { type SaveOrder, saveRequest } from "./flashcardSaves.ts";
import { isSaveRefused } from "./isSaveRefused.ts";

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

/** Keeps a failed save again as it was kept before. */
export function keepAgain(kept: FailedRequest) {
  return { type: "keepFailedRequest", failed: kept } satisfies Effect;
}

/** Forgets the failed save of a flashcard. */
export function forgetFailedSave(flashcardId: string) {
  return {
    type: "forgetFailedRequest",
    id: failedSaveKeptId(flashcardId),
  } satisfies Effect;
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
