import type {
  ReviewCardState,
  ReviewHoldKind,
  ReviewIntervals,
  ReviewPhase,
  ReviewQueueCard,
  ReviewRating,
} from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { exampleListedFlashcard } from "../flashcards/exampleFlashcards.ts";
import { reviewRequestIds } from "./reviewRequests.ts";
import { selectReviewScreen } from "./selectReviewSession.ts";

const minuteMs = 60 * 1000;

/** The intervals of an example card's ratings. */
export const exampleIntervals: ReviewIntervals = {
  again_ms: 10 * minuteMs,
  hard_ms: 24 * 60 * minuteMs,
  good_ms: 2 * 24 * 60 * minuteMs,
  easy_ms: 8 * 24 * 60 * minuteMs,
};

/** The schedule of a card of p1 in a phase, due at a time. */
export function exampleCardState(
  phase: ReviewPhase,
  dueAtMs = 0,
): ReviewCardState {
  return {
    state: phase,
    due_at_ms: dueAtMs,
    stability: 1,
    difficulty: 5,
    interval_ms: 10 * minuteMs,
    reps: 1,
    lapses: 0,
    learning_step: 0,
    last_reviewed_at_ms: 0,
    is_leech: false,
  };
}

/** A card of p1's review queue for a flashcard whose word is its id: new without a phase, or else in the phase given. */
export function exampleQueueCard(
  id: string,
  phase: ReviewPhase | null = null,
  dueAtMs = 0,
): ReviewQueueCard {
  return {
    flashcard: exampleListedFlashcard(id, id),
    state: phase === null ? null : exampleCardState(phase, dueAtMs),
    intervals: exampleIntervals,
  };
}

/** Opens the review of p1. */
export const openReview = actions.navigated({
  type: "openReview",
  projectId: "p1",
});

/** The queue of p1's review arriving with the given cards. */
export function queueArrived(...cards: ReviewQueueCard[]) {
  return actions.requestSettled(
    reviewRequestIds("p1").queue,
    { kind: "getReviewQueue", projectId: "p1" },
    { ok: true, data: { cards } },
  );
}

/** The queue of p1's review failing to load. */
export const queueFailed = actions.requestSettled(
  reviewRequestIds("p1").queue,
  { kind: "getReviewQueue", projectId: "p1" },
  { ok: false, error: { status: 500, message: "Server error" } },
);

/** Shows the answer and rates the shown card at a time. */
export function rated(rating: ReviewRating, atMs = 0): AppAction[] {
  return [actions.reviewAnswerShown(atMs), actions.reviewRated(rating, atMs)];
}

/** The answer of a flashcard of p1 landing, logged at `answeredAtMs` and leaving the card in a phase, due at a time. */
export function answerLanded(
  flashcardId: string,
  answeredAtMs: number,
  phase: ReviewPhase = "review",
  dueAtMs = 0,
) {
  return actions.requestSettled(
    `${reviewRequestIds("p1").answer}/1`,
    answerRequest(flashcardId),
    {
      ok: true,
      data: {
        state: exampleCardState(phase, dueAtMs),
        entry: exampleLogEntry(flashcardId, answeredAtMs, phase),
        intervals: exampleIntervals,
      },
    },
  );
}

/** The answer of a flashcard of p1 failing to land. */
export function answerFailed(flashcardId: string) {
  return actions.requestSettled(
    `${reviewRequestIds("p1").answer}/1`,
    answerRequest(flashcardId),
    { ok: false, error: { status: 500, message: "Server error" } },
  );
}

/** The undo of p1's latest answer landing, or failing. */
export function undoSettled(answeredAtMs: number, isUndone = true) {
  return actions.requestSettled(
    reviewRequestIds("p1").undo,
    { kind: "undoReviewAnswer", projectId: "p1", answeredAtMs },
    isUndone
      ? {
          ok: true,
          data: { flashcard_id: "", state: null, intervals: exampleIntervals },
        }
      : { ok: false, error: { status: 409, message: "Not the latest" } },
  );
}

/** The bury or suspension of a flashcard of p1 landing, or failing. */
export function holdSettled(
  flashcardId: string,
  hold: ReviewHoldKind,
  isHeld = true,
) {
  return actions.requestSettled(
    `${reviewRequestIds("p1").hold}/1`,
    { kind: "holdReviewCard", projectId: "p1", flashcardId, hold },
    isHeld
      ? { ok: true, data: undefined }
      : { ok: false, error: { status: 500, message: "Server error" } },
  );
}

/** The lift of a hold on a flashcard of p1 landing. */
export function liftSettled(flashcardId: string) {
  return actions.requestSettled(
    `${reviewRequestIds("p1").hold}/2`,
    { kind: "liftReviewHold", projectId: "p1", flashcardId },
    { ok: true, data: undefined },
  );
}

/** The review screen's state after opening p1's review and the given actions. */
export function reviewAfter(...given: AppAction[]) {
  const review = selectReviewScreen(stateAfter(openReview, ...given));
  if (review === null) throw new Error("The review is not open.");
  return review;
}

function answerRequest(flashcardId: string) {
  return {
    kind: "answerReview",
    projectId: "p1",
    flashcardId,
    rating: "good",
    durationMs: 0,
  } as const;
}

function exampleLogEntry(
  flashcardId: string,
  answeredAtMs: number,
  phase: ReviewPhase,
) {
  return {
    flashcard_id: flashcardId,
    answered_at_ms: answeredAtMs,
    rating: "good",
    kind: "review",
    state: phase,
    elapsed_ms: 0,
    duration_ms: 0,
    stability: 1,
    difficulty: 5,
    interval_ms_before: 0,
    interval_ms_after: 0,
    desired_retention: 0.9,
  } as const;
}
