import type { ReviewRating } from "@easyimmerse/types";
import type { Effect } from "../app/effect.ts";

/** The number of new cards "Learn more" adds to today's. */
export const extraNewCardCount = 20;

/** The ids of the review screen's requests about a project. */
export const reviewRequestIds = (projectId: string) => ({
  queue: `review/${projectId}/queue`,
  /** The prefix of the answers' ids, each of which takes the first id free under it. */
  answer: `review/${projectId}/answer`,
  undo: `review/${projectId}/undo`,
  allowance: `review/${projectId}/allowance`,
  /** The prefix of the deletions' ids, each of which takes the first id free under it. */
  deletion: `review/${projectId}/delete`,
});

/**
 * The scope of a project's review requests, which are sent one at a time in the order they were asked for,
 * so that the server sees every answer before the next fetch of the queue, and an undo before the answers that follow it.
 */
const reviewScope = (projectId: string) => `review:${projectId}`;

/** Fetches the cards of the project's review session. */
export function fetchQueue(projectId: string) {
  return {
    type: "sendRequest",
    id: reviewRequestIds(projectId).queue,
    scope: reviewScope(projectId),
    request: { kind: "getReviewQueue", projectId },
  } satisfies Effect;
}

/** Sends the user's rating of a card, with the time the card was looked at. */
export function sendAnswer(
  projectId: string,
  flashcardId: string,
  rating: ReviewRating,
  durationMs: number,
) {
  return {
    type: "sendRequestWithFreeId",
    prefix: reviewRequestIds(projectId).answer,
    scope: reviewScope(projectId),
    request: {
      kind: "answerReview",
      projectId,
      flashcardId,
      rating,
      durationMs,
    },
  } satisfies Effect;
}

/** Undoes the answer whose log entry has the given time, which must be the project's latest. */
export function sendUndo(projectId: string, answeredAtMs: number) {
  return {
    type: "sendRequest",
    id: reviewRequestIds(projectId).undo,
    scope: reviewScope(projectId),
    request: { kind: "undoReviewAnswer", projectId, answeredAtMs },
  } satisfies Effect;
}

/** Raises today's allowance of new cards by `extraNewCardCount`. */
export function raiseAllowance(projectId: string) {
  return {
    type: "sendRequest",
    id: reviewRequestIds(projectId).allowance,
    scope: reviewScope(projectId),
    request: {
      kind: "raiseReviewAllowance",
      projectId,
      extraNewCards: extraNewCardCount,
    },
  } satisfies Effect;
}

/**
 * Deletes a flashcard from the review. It goes in the review's scope rather than the flashcard's,
 * so that a fetch of the queue that follows it never brings the card back.
 */
export function sendDeletion(projectId: string, flashcardId: string) {
  return {
    type: "sendRequestWithFreeId",
    prefix: reviewRequestIds(projectId).deletion,
    scope: reviewScope(projectId),
    request: {
      kind: "deleteFlashcard",
      projectId,
      flashcardId,
      purpose: { type: "delete" },
    },
  } satisfies Effect;
}
