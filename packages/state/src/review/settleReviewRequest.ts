import type { ReviewQueueCard } from "@easyimmerse/types";
import { updated } from "../app/updated.ts";
import { show } from "../flashcards/flashcardNotices.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { isSettled } from "../server/isSettled.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../server/serverRequest.ts";
import { reviewRequestIds } from "./reviewRequests.ts";
import type { ReviewScreenState } from "./reviewScreenState.ts";
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

/**
 * Takes the end of a review request: the queue arriving or failing, an answer landing, which brings the card back
 * when it is due again within the session, and an undo landing, which shows the card again as it was.
 * A failed answer puts its card back in the queue; a failed undo or allowance is told of.
 */
export function settleReviewRequest(
  session: ReviewScreenState,
  action: RequestSettled,
  projectId: string,
) {
  const ids = reviewRequestIds(projectId);
  if (isSettled(action, ids.queue, "getReviewQueue"))
    return updated(queueSettled(session, action.outcome));
  if (action.request.kind === "answerReview")
    return answerSettled(session, action as AnswerSettled);
  if (isSettled(action, ids.undo, "undoReviewAnswer"))
    return undoSettled(session, action.outcome.ok);
  if (isSettled(action, ids.allowance, "raiseReviewAllowance"))
    return updated(
      session,
      ...(action.outcome.ok ? [] : [show(reviewNotices.allowanceFailed)]),
    );
  return updated(session);
}

const reviewNotices = {
  answerFailed: (word: string) =>
    transientNotice("danger", `Your rating of “${word}” could not be saved.`),
  undoFailed: transientNotice("danger", "The rating could not be undone."),
  allowanceFailed: transientNotice(
    "danger",
    "More new cards could not be added for today.",
  ),
};

/**
 * Takes the queue the server gave. Cards the server lists take the place of the same cards coming back,
 * since the server counts their due times at its clock. Unless a card is shown, the queue's first card is.
 */
function queueSettled(
  session: ReviewScreenState,
  outcome: RequestOutcome<"getReviewQueue">,
) {
  if (!outcome.ok)
    return outcome.error.status === "ABORTED"
      ? session
      : ({ ...session, queueStatus: "failed" } satisfies ReviewScreenState);
  const { shown } = session;
  const cards = shown
    ? without(outcome.data.cards, shown.flashcard.id)
    : outcome.data.cards;
  const listed = new Set(cards.map(({ flashcard }) => flashcard.id));
  const loaded = {
    ...session,
    queueStatus: "loaded",
    comingBack: session.comingBack.filter(
      ({ flashcard }) => !listed.has(flashcard.id),
    ),
  } satisfies ReviewScreenState;
  const [first = null, ...rest] = cards;
  return shown
    ? { ...loaded, queue: cards }
    : showCard({ ...loaded, queue: rest }, first);
}

function answerSettled(session: ReviewScreenState, settled: AnswerSettled) {
  const { request, outcome } = settled;
  const index = session.answers.findIndex(
    ({ card, answeredAtMs }) =>
      answeredAtMs === null && card.flashcard.id === request.flashcardId,
  );
  const answer = session.answers[index];
  if (answer === undefined) return updated(session);
  if (!outcome.ok)
    return updated(
      {
        ...session,
        answers: session.answers.toSpliced(index, 1),
        queue: [answer.card, ...session.queue],
      },
      show(reviewNotices.answerFailed(answer.card.flashcard.content.word)),
    );
  const { entry, state, intervals } = outcome.data;
  const back: ReviewQueueCard = {
    flashcard: answer.card.flashcard,
    state,
    intervals,
  };
  return updated({
    ...session,
    answers: session.answers.with(index, {
      ...answer,
      answeredAtMs: entry.answered_at_ms,
    }),
    comingBack: isDueWithinSession(state)
      ? comeBack(session.comingBack, back)
      : session.comingBack,
  });
}

/** Shows again the card whose rating was undone, as it was before the rating, ahead of the card that was shown. */
function undoSettled(session: ReviewScreenState, isUndone: boolean) {
  const settled = { ...session, undoingAtMs: null };
  const index = session.answers.findIndex(
    ({ answeredAtMs }) => answeredAtMs === session.undoingAtMs,
  );
  const answer = session.answers[index];
  if (!isUndone) return updated(settled, show(reviewNotices.undoFailed));
  if (answer === undefined) return updated(settled);
  const id = answer.card.flashcard.id;
  const { shown } = session;
  const queue = without(session.queue, id);
  return updated(
    showCard(
      {
        ...settled,
        answers: session.answers.toSpliced(index, 1),
        queue: shown && shown.flashcard.id !== id ? [shown, ...queue] : queue,
        comingBack: without(session.comingBack, id),
        shownAtMs: null,
      },
      answer.card,
    ),
  );
}
