import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";
import type { RequestRecord } from "../operations/operations.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import {
  type FlashcardCard,
  flashcardIdOf,
  mediaFileIdOf,
} from "./flashcardCard.ts";
import type { Rollback } from "./flashcardForm.ts";

/**
 * A card that left the form and whose background save failed, read from the save request kept for it,
 * until the user retries, opens or discards it.
 */
export type FailedSave = {
  card: FlashcardCard;
  projectId: string;
  /** The media file whose form edits the card, or null when it has none, in which case it has no Open. */
  mediaFileId: string | null;
  /** Whether the server refused the save, so that only Open and Discard are offered. */
  isRefused: boolean;
  /** Whether the user pressed Open and the requests on the way to its form are under way. */
  isOpening: boolean;
  rollbackIfDiscarded: Rollback | null;
  /** The kept request it is read from: the save a Retry sends, and how the last save failed. */
  kept: FailedRequest;
};

/** The app state that the failed save selectors read. */
type OperationsApp = Pick<AppState, "operations">;

const keptIdPrefix = "flashcards/failedSave/";

/** The start of the ids of the requests on the way to opening a failed save. */
export const openingIdPrefix = "flashcards/opening/";

/** The end of the id of the project request on the way to opening a failed save. */
export const openingProjectIdSuffix = "/project";

/**
 * The client errors that sending again may cure: missing or expired credentials (401), a denial that may be lifted (403),
 * a request the server gave up waiting for (408), and too many requests (429).
 */
const passingStatuses: ReadonlySet<number> = new Set([401, 403, 408, 429]);

/**
 * Returns the failed saves, in the order they were first kept,
 * as the same array while they stay the same, so that other requests do not draw the flashcards again.
 */
export const selectFailedSaves = createSelector(
  [(app: OperationsApp) => app.operations],
  (operations) => {
    const inFlightIds = new Set(operations.requests.map(({ id }) => id));
    return operations.failedRequests.flatMap((kept) => {
      const failedSave = failedSaveOf(kept, inFlightIds);
      return failedSave ? [failedSave] : [];
    });
  },
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
  const inFlightIds = new Set(app.operations.requests.map(({ id }) => id));
  return failedSaveOf(kept, inFlightIds);
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

/** The id under which the failed save of a flashcard is kept. */
export function failedSaveKeptId(flashcardId: string): string {
  return `${keptIdPrefix}${flashcardId}`;
}

/** The id of the flashcard a failed save would create or replace. */
export function failedSaveIdOf(failedSave: FailedSave): string {
  return flashcardIdOf(failedSave.card);
}

/** The ids of the requests on the way to opening a flashcard's failed save. */
export const openingIds = (flashcardId: string) => ({
  mediaFiles: `${openingIdPrefix}${flashcardId}`,
  project: `${openingIdPrefix}${flashcardId}${openingProjectIdSuffix}`,
});

/**
 * Tells whether the server refused a save, so that sending it again cannot succeed,
 * unlike a lost connection, a timeout, a server error, or a client error that may pass.
 */
export function isSaveRefused({ status }: RequestFailure): boolean {
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    !passingStatuses.has(status)
  );
}

/** The failed save a kept request holds, given the ids of the requests in flight, or null when the request is not a kept card save. */
function failedSaveOf(
  kept: FailedRequest,
  inFlightIds: ReadonlySet<string>,
): FailedSave | null {
  const { request, failure } = kept;
  if (!kept.id.startsWith(keptIdPrefix) || request.kind !== "saveFlashcard")
    return null;
  if (request.purpose.type !== "save") return null;
  const { card, rollbackIfDiscarded } = request.purpose;
  return {
    card,
    projectId: request.projectId,
    mediaFileId: mediaFileIdOf(card),
    isRefused: isSaveRefused(failure),
    isOpening: isOpeningIn(inFlightIds, request.flashcardId),
    rollbackIfDiscarded,
    kept,
  };
}

function isOpeningIn(
  inFlightIds: ReadonlySet<string>,
  flashcardId: string,
): boolean {
  const ids = openingIds(flashcardId);
  return inFlightIds.has(ids.mediaFiles) || inFlightIds.has(ids.project);
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
