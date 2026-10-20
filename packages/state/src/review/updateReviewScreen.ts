import type { AppAction } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { Effect } from "../app/effect.ts";
import { updated } from "../app/updated.ts";
import { flashcardActions } from "../flashcards/flashcardActions.ts";
import type { ReviewAction } from "./reviewActions.ts";
import type { ReviewFlashcards } from "./reviewFlashcards.ts";
import {
  extraNewCardCount,
  fetchQueue,
  raiseAllowance,
  sendAnswer,
  sendDeletion,
  sendHold,
  sendLift,
  sendUndo,
} from "./reviewRequests.ts";
import type { ReviewScreenState, SessionStep } from "./reviewScreenState.ts";
import { canUndo, showNext } from "./reviewSession.ts";
import { settleReviewRequest } from "./settleReviewRequest.ts";
import { skipDeletedCards } from "./skipDeletedCards.ts";

type Rated = Extract<ReviewAction, { type: "reviewRated" }>;
type Held = Extract<ReviewAction, { type: "reviewCardHeld" }>;

/**
 * Updates the review of a project: the card shown and its side, the ratings and holds sent and taken back,
 * and the fetches of the queue, which happen as the screen opens and again whenever the session runs out of cards.
 * A rating, a bury or a suspension moves on to the next card at once, without waiting for the server.
 */
export function updateReviewScreen(
  session: ReviewScreenState,
  action: AppAction,
  projectId: string,
  flashcards: ReviewFlashcards | null,
) {
  const current = skipDeletedCards(session, flashcards);
  const [next, effects] = updateSession(current, action, projectId, flashcards);
  const hasRunOut = session.shown !== null && current.shown === null;
  return hasRunOut && next.queueStatus !== "loading"
    ? reload(next, ...effects, fetchQueue(projectId))
    : updated(next, ...effects);
}

function updateSession(
  session: ReviewScreenState,
  action: AppAction,
  projectId: string,
  flashcards: ReviewFlashcards | null,
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
      return reload(
        session,
        raiseAllowance(projectId, { newCards: extraNewCardCount, reviews: 0 }),
        fetchQueue(projectId),
      );
    case "reviewMoreReviewsRequested":
      return reload(
        session,
        raiseAllowance(projectId, { newCards: 0, reviews: action.reviewCount }),
        fetchQueue(projectId),
      );
    case "reviewCardHeld":
      return hold(session, action, projectId);
    case "reviewScreenshotExpanded":
      return updated({
        ...session,
        isScreenshotExpanded: session.shown !== null,
      });
    case "reviewScreenshotClosed":
      return updated({ ...session, isScreenshotExpanded: false });
    case "reviewQueueRetried":
      return reload(session, fetchQueue(projectId));
    case "reviewFlashcardEditRequested":
      return updated(session, ...openInEditor(session, flashcards));
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
      return settleReviewRequest(session, action, projectId, flashcards);
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
  const step: SessionStep = { kind: "answer", card, answeredAtMs: null };
  return moveOn(
    { ...session, steps: [...session.steps, step] },
    atMs,
    projectId,
    sendAnswer(projectId, card.flashcardId, rating, durationMs),
  );
}

/** Buries or suspends the shown card and shows the next one. */
function hold(
  session: ReviewScreenState,
  { hold, atMs }: Held,
  projectId: string,
) {
  const card = session.shown;
  if (card === null) return updated(session);
  const step: SessionStep = { kind: "hold", card, hold, hasLanded: false };
  return moveOn(
    { ...session, steps: [...session.steps, step] },
    atMs,
    projectId,
    sendHold(projectId, card.flashcardId, hold),
  );
}

/** Takes back the session's latest step once it has landed, unless an undo is already on its way. */
function requestUndo(session: ReviewScreenState, projectId: string) {
  const latest = session.steps.at(-1);
  if (!canUndo(session) || latest === undefined) return updated(session);
  return updated(
    { ...session, undoing: latest },
    latest.kind === "answer"
      ? sendUndo(projectId, latest.answeredAtMs ?? 0)
      : sendLift(projectId, latest.card.flashcardId),
  );
}

/** Deletes the shown card and moves on. Its steps in the session go with it, as its review history does on the server. */
function deleteShown(
  session: ReviewScreenState,
  atMs: number,
  projectId: string,
) {
  const card = session.shown;
  if (card === null) return updated({ ...session, isConfirmingDelete: false });
  const steps = session.steps.filter(
    (step) => step.card.flashcardId !== card.flashcardId,
  );
  return moveOn(
    { ...session, steps, isConfirmingDelete: false },
    atMs,
    projectId,
    sendDeletion(projectId, card.flashcardId),
  );
}

/** Opens the shown card in the editor of its media file's screen, to which the route moves. */
function openInEditor(
  { shown }: ReviewScreenState,
  flashcards: ReviewFlashcards | null,
) {
  const flashcard = shown && flashcards?.byId.get(shown.flashcardId);
  if (flashcard?.media_file_id == null) return [];
  return [dispatch(flashcardActions.flashcardOpened(flashcard.id, flashcard))];
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
