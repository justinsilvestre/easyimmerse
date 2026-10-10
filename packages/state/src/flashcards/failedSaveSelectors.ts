import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { RequestRecord } from "../operations/operations.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import {
  type FailedSave,
  failedSaveKeptId,
  isFailedSaveKeptId,
} from "./failedSave.ts";
import { openingIds } from "./failedSaveOpeningRequests.ts";
import { mediaFileIdOf } from "./flashcardCard.ts";
import { isSaveRefused } from "./isSaveRefused.ts";

/** The app state that the failed save selectors read. */
type OperationsApp = Pick<AppState, "operations">;

/**
 * Returns the failed saves, in the order they were first kept,
 * as the same array while they stay the same, so that other requests do not draw the flashcards again.
 */
export const selectFailedSaves = createSelector(
  [(app: OperationsApp) => app.operations],
  (operations) =>
    operations.failedRequests.flatMap((kept) => {
      const failedSave = selectKeptFailedSave({ operations }, kept);
      return failedSave ? [failedSave] : [];
    }),
  { memoizeOptions: { resultEqualityCheck: isSameFailedSaves } },
);

/** Returns the failed save of a flashcard, if there is one. */
export function selectFailedSave(
  app: OperationsApp,
  flashcardId: string,
): FailedSave | undefined {
  const id = failedSaveKeptId(flashcardId);
  const kept = app.operations.failedRequests.find((each) => each.id === id);
  return (kept && selectKeptFailedSave(app, kept)) ?? undefined;
}

/** Returns the failed save a kept request holds, or null when the request is not a kept card save. */
export function selectKeptFailedSave(
  app: OperationsApp,
  kept: FailedRequest,
): FailedSave | null {
  const { request, failure } = kept;
  if (!isFailedSaveKeptId(kept.id) || request.kind !== "saveFlashcard")
    return null;
  if (request.purpose.type !== "save") return null;
  const { card, rollbackIfDiscarded } = request.purpose;
  return {
    card,
    projectId: request.projectId,
    mediaFileId: mediaFileIdOf(card),
    isRefused: isSaveRefused(failure),
    isOpening: selectIsOpeningInFlight(app, request.flashcardId),
    rollbackIfDiscarded,
    kept,
  };
}

/** Tells whether the requests on the way to opening a flashcard's failed save are under way. */
export function selectIsOpeningInFlight(
  app: OperationsApp,
  flashcardId: string,
): boolean {
  const ids = openingIds(flashcardId);
  return (
    selectIsRequestInFlight(app, ids.mediaFiles) ||
    selectIsRequestInFlight(app, ids.project)
  );
}

/** Returns the pending Retry of a flashcard, or undefined when none is pending. */
export function selectPendingRetry(
  app: OperationsApp,
  flashcardId: string,
): RequestRecord | undefined {
  return app.operations.requests.find(
    ({ request }) =>
      request.kind === "saveFlashcard" &&
      request.flashcardId === flashcardId &&
      request.purpose.type === "save" &&
      request.purpose.from === "retry",
  );
}

function isSameFailedSaves(
  first: readonly FailedSave[],
  second: readonly FailedSave[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (failedSave, index) =>
        failedSave.kept === second[index]?.kept &&
        failedSave.isOpening === second[index]?.isOpening,
    )
  );
}
