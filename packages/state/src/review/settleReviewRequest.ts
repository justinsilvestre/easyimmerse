import type { ReviewHoldKind } from "@easyimmerse/types";
import { updated } from "../app/updated.ts";
import { show } from "../flashcards/flashcardNotices.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { isSettled } from "../server/isSettled.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../server/serverRequest.ts";
import type { ReviewFlashcards } from "./reviewFlashcards.ts";
import { reviewRequestIds } from "./reviewRequests.ts";
import {
  type ReviewScreenState,
  type SessionCard,
  type SessionStep,
  sessionCardOf,
} from "./reviewScreenState.ts";
import {
  comeBack,
  isDueWithinSession,
  showCard,
  without,
} from "./reviewSession.ts";

type AnswerSettled = Extract<
  RequestSettled,
  { request: { kind: "answerReview" } }
>;
type HoldSettled = Extract<
  RequestSettled,
  { request: { kind: "holdReviewCard" } }
>;

/**
 * Takes the end of a review request: the queue arriving or failing, an answer landing, which brings the card back
 * when it is due again within the session, a hold landing, and an undo landing, which shows the card again as it was.
 * A failed answer or hold puts its card back in the queue; a failed undo or allowance is told of.
 */
export function settleReviewRequest(
  session: ReviewScreenState,
  action: RequestSettled,
  projectId: string,
  flashcards: ReviewFlashcards | null,
) {
  const ids = reviewRequestIds(projectId);
  const wordOf = (flashcardId: string) =>
    flashcards?.byId.get(flashcardId)?.content.word ?? null;
  if (isSettled(action, ids.queue, "getReviewQueue"))
    return updated(queueSettled(session, action.outcome, flashcards));
  if (action.request.kind === "answerReview")
    return answerSettled(session, action as AnswerSettled, wordOf);
  if (
    action.request.kind === "holdReviewCard" &&
    action.id.startsWith(ids.hold)
  )
    return holdSettled(session, action as HoldSettled, wordOf);
  if (
    isSettled(action, ids.undo, "undoReviewAnswer") ||
    (action.request.kind === "liftReviewHold" && action.id.startsWith(ids.hold))
  )
    return undoSettled(session, action.outcome.ok);
  if (isSettled(action, ids.allowance, "raiseReviewAllowance"))
    return updated(
      session,
      ...(action.outcome.ok ? [] : [show(reviewNotices.allowanceFailed)]),
    );
  return updated(session);
}

/** The notices name a card by its word, or as "the card" while its flashcard is not listed. */
const reviewNotices = {
  answerFailed: (word: string | null) =>
    transientNotice(
      "danger",
      `Your rating of ${word === null ? "the card" : `“${word}”`} could not be saved.`,
    ),
  holdFailed: (word: string | null, hold: ReviewHoldKind) =>
    transientNotice(
      "danger",
      `${word === null ? "The card" : `“${word}”`} could not be ${hold}.`,
    ),
  undoFailed: transientNotice("danger", "That could not be undone."),
  allowanceFailed: transientNotice(
    "danger",
    "More new cards could not be added for today.",
  ),
};

/**
 * Takes the queue the server gave, keeping of each card what only the session holds. Cards the server lists take the place
 * of the same cards coming back, since the server counts their due times at its clock. Unless a card is shown, the queue's first card is.
 * It notes when the cached flashcards list was fetched, so that a later list that lacks a card shows it was deleted.
 */
function queueSettled(
  session: ReviewScreenState,
  outcome: RequestOutcome<"getReviewQueue">,
  flashcards: ReviewFlashcards | null,
) {
  if (!outcome.ok)
    return outcome.error.status === "ABORTED"
      ? session
      : ({ ...session, queueStatus: "failed" } satisfies ReviewScreenState);
  const { shown } = session;
  const arrived = outcome.data.cards.map(sessionCardOf);
  const cards = shown ? without(arrived, shown.flashcardId) : arrived;
  const listed = new Set(cards.map(({ flashcardId }) => flashcardId));
  const loaded = {
    ...session,
    queueStatus: "loaded",
    comingBack: session.comingBack.filter(
      ({ flashcardId }) => !listed.has(flashcardId),
    ),
    listFetchedAtQueueMs:
      flashcards?.fetchedAtMs ?? session.listFetchedAtQueueMs,
  } satisfies ReviewScreenState;
  const [first = null, ...rest] = cards;
  return shown
    ? { ...loaded, queue: cards }
    : showCard({ ...loaded, queue: rest }, first);
}

function answerSettled(
  session: ReviewScreenState,
  settled: AnswerSettled,
  wordOf: (flashcardId: string) => string | null,
) {
  const { request, outcome } = settled;
  const index = session.steps.findIndex(
    (step) =>
      step.kind === "answer" &&
      step.answeredAtMs === null &&
      step.card.flashcardId === request.flashcardId,
  );
  const answer = session.steps[index];
  if (answer?.kind !== "answer") return updated(session);
  if (!outcome.ok)
    return updated(
      putBack(session, index),
      show(reviewNotices.answerFailed(wordOf(request.flashcardId))),
    );
  const { entry, state, intervals } = outcome.data;
  const back: SessionCard = {
    flashcardId: request.flashcardId,
    state,
    intervals,
  };
  return updated({
    ...session,
    steps: session.steps.with(index, {
      ...answer,
      answeredAtMs: entry.answered_at_ms,
    }),
    comingBack: isDueWithinSession(state)
      ? comeBack(session.comingBack, back)
      : session.comingBack,
  });
}

function holdSettled(
  session: ReviewScreenState,
  { request, outcome }: HoldSettled,
  wordOf: (flashcardId: string) => string | null,
) {
  const index = session.steps.findIndex(
    (step) =>
      step.kind === "hold" &&
      !step.hasLanded &&
      step.card.flashcardId === request.flashcardId,
  );
  const step = session.steps[index];
  if (step?.kind !== "hold") return updated(session);
  if (!outcome.ok)
    return updated(
      putBack(session, index),
      show(reviewNotices.holdFailed(wordOf(request.flashcardId), step.hold)),
    );
  return updated({
    ...session,
    steps: session.steps.with(index, { ...step, hasLanded: true }),
  });
}

/** Forgets a step the server did not record and puts its card back at the front of the queue. */
function putBack(session: ReviewScreenState, index: number) {
  const step = session.steps[index] as SessionStep;
  return {
    ...session,
    steps: session.steps.toSpliced(index, 1),
    queue: [step.card, ...session.queue],
  } satisfies ReviewScreenState;
}

/** Shows again the card whose step was undone, as it was before the step, ahead of the card that was shown. */
function undoSettled(session: ReviewScreenState, isUndone: boolean) {
  const settled = { ...session, undoing: null };
  const index = session.undoing ? session.steps.indexOf(session.undoing) : -1;
  const step = session.steps[index];
  if (!isUndone) return updated(settled, show(reviewNotices.undoFailed));
  if (step === undefined) return updated(settled);
  const id = step.card.flashcardId;
  const { shown } = session;
  const queue = without(session.queue, id);
  return updated(
    showCard(
      {
        ...settled,
        steps: session.steps.toSpliced(index, 1),
        queue: shown && shown.flashcardId !== id ? [shown, ...queue] : queue,
        comingBack: without(session.comingBack, id),
        shownAtMs: null,
      },
      step.card,
    ),
  );
}
