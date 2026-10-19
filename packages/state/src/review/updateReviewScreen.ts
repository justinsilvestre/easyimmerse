import type { AppAction } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { Effect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import { flashcardActions } from "../flashcards/flashcardActions.ts";
import type { ReviewAction } from "./reviewActions.ts";
import {
  fetchQueue,
  raiseAllowance,
  sendAnswer,
  sendDeletion,
  sendUndo,
} from "./reviewRequests.ts";
import type { ReviewScreenState } from "./reviewScreenState.ts";
import { canUndo, showNext } from "./reviewSession.ts";
import { settleReviewRequest } from "./settleReviewRequest.ts";

type Rated = Extract<ReviewAction, { type: "reviewRated" }>;

/**
 * Updates the review of a project: the card shown and its side, the ratings sent and taken back,
 * and the fetches of the queue, which happen as the screen opens and again whenever the session runs out of cards.
 * A rating moves on to the next card at once, without waiting for the server.
 */
export function updateReviewScreen(
  session: ReviewScreenState,
  action: AppAction,
  projectId: string,
) {
  switch (action.type) {
    case "reviewAnswerShown":
      return updated(showAnswer(session, action.atMs));
    case "reviewRated":
      return rate(session, action, projectId);
    case "reviewUndoRequested":
      return requestUndo(session, projectId);
    case "reviewAudioReplayed":
      return updated({ ...session, replayCount: session.replayCount + 1 });
    case "reviewAllowanceRaised":
      return reload(session, raiseAllowance(projectId), fetchQueue(projectId));
    case "reviewQueueRetried":
      return reload(session, fetchQueue(projectId));
    case "reviewFlashcardEditRequested":
      return updated(session, ...openInEditor(session));
    case "reviewFlashcardDeleteRequested":
      return updated({
        ...session,
        isConfirmingDelete: session.shown !== null,
      });
    case "reviewFlashcardDeleteCancelled":
      return updated({ ...session, isConfirmingDelete: false });
    case "reviewFlashcardDeleteConfirmed":
      return deleteShown(session, action.atMs, projectId);
    case "requestSettled":
      return settleReviewRequest(session, action, projectId);
    default:
      return updated(session);
  }
}

function showAnswer(session: ReviewScreenState, atMs: number) {
  if (session.shown === null || session.stage === "back") return session;
  return {
    ...session,
    stage: "back",
    shownAtMs: session.shownAtMs ?? atMs,
  } satisfies ReviewScreenState;
}

/** Sends the rating of the shown card, timed from when it appeared, and shows the next card. */
function rate(
  session: ReviewScreenState,
  { rating, atMs }: Rated,
  projectId: string,
) {
  const card = session.shown;
  if (card === null || session.stage !== "back") return updated(session);
  const durationMs = Math.max(0, atMs - (session.shownAtMs ?? atMs));
  const answer = { card, answeredAtMs: null };
  return moveOn(
    { ...session, answers: [...session.answers, answer] },
    atMs,
    projectId,
    sendAnswer(projectId, card.flashcard.id, rating, durationMs),
  );
}

/** Takes back the session's latest rating once it has landed, unless an undo is already on its way. */
function requestUndo(session: ReviewScreenState, projectId: string) {
  const answeredAtMs = session.answers.at(-1)?.answeredAtMs;
  if (!canUndo(session) || answeredAtMs == null) return updated(session);
  return updated(
    { ...session, undoingAtMs: answeredAtMs },
    sendUndo(projectId, answeredAtMs),
  );
}

/** Deletes the shown card and moves on. Its ratings in the session go with it, as its review history does on the server. */
function deleteShown(
  session: ReviewScreenState,
  atMs: number,
  projectId: string,
) {
  const card = session.shown;
  if (card === null) return updated({ ...session, isConfirmingDelete: false });
  const answers = session.answers.filter(
    (answer) => answer.card.flashcard.id !== card.flashcard.id,
  );
  return moveOn(
    { ...session, answers, isConfirmingDelete: false },
    atMs,
    projectId,
    sendDeletion(projectId, card.flashcard.id),
  );
}

/** Opens the shown card in the editor of its media file's screen, to which the route moves. */
function openInEditor({ shown }: ReviewScreenState) {
  if (shown?.flashcard.media_file_id == null) return [];
  return [
    dispatch(
      flashcardActions.flashcardOpened(shown.flashcard.id, shown.flashcard),
    ),
  ];
}

/** Shows the next card at a moment, or fetches the queue again once the session has run out of cards. */
function moveOn(
  session: ReviewScreenState,
  atMs: number,
  projectId: string,
  effect: Effect,
) {
  const next = showNext({ ...session, shownAtMs: atMs }, atMs);
  return next.shown === null
    ? reload(next, effect, fetchQueue(projectId))
    : updated(next, effect);
}

function reload(session: ReviewScreenState, ...effects: Effect[]) {
  return updated({ ...session, queueStatus: "loading" }, ...effects);
}
