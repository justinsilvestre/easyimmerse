import type {
  Flashcard,
  Project,
  ReviewQueueCard,
  ReviewSummary,
} from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { AppState } from "../app/appState.ts";
import type { RootState } from "../app/createAppStore.ts";
import { mainScreenOf } from "../route/route.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import { extraNewCardCount, extraReviewCount } from "./reviewRequests.ts";
import type { ReviewScreenState, SessionCard } from "./reviewScreenState.ts";
import { answersOf, canUndo } from "./reviewSession.ts";
import type { ReviewEnd, ReviewSessionProgress } from "./reviewSessionView.ts";

/** Returns the review screen's state, or null while the review is not the main screen. */
export function selectReviewScreen(
  app: Pick<AppState, "screen">,
): ReviewScreenState | null {
  const { main } = app.screen;
  return main.kind === "review" ? main : null;
}

/** Returns the project whose review is the main screen, or null. */
export function selectReviewProjectId(root: Pick<RootState, "app">) {
  const main = mainScreenOf(root.app.route);
  return main.screen === "review" ? main.projectId : null;
}

/**
 * Selects what the review screen shows: the card, its content read from the cached flashcards list, and its side, how often a leech was forgotten, the cards left by kind, how the session ended,
 * whether Undo can take a step back, whether the screenshot is shown at full size,
 * and a key that changes whenever the card's audio is to play from its start.
 * The end reads the cached project and the cached summary of its review. Null while the review is not the main screen.
 * While the shown card's flashcard is not listed yet, no card and no end are shown, as while the queue loads.
 */
export const selectReviewSession = createSelector(
  [
    (root: RootState) => selectReviewScreen(root.app),
    (root: RootState) => cachedOfReview(root, "getProject"),
    (root: RootState) => cachedOfReview(root, "getReviewSummary"),
    (root: RootState) => cachedOfReview(root, "listFlashcards")?.flashcards,
  ],
  (session, project, summary, flashcards) =>
    session && {
      card: shownCardOf(session.shown, flashcards),
      leechLapseCount: leechLapseCountOf(session.shown),
      stage: session.stage,
      progress: progressOf(session),
      end: endOf(session, project, summary),
      canUndo: canUndo(session),
      isConfirmingDelete: session.isConfirmingDelete,
      isScreenshotExpanded: session.isScreenshotExpanded,
      audioPlayKey: [
        session.shown?.flashcardId,
        session.steps.length,
        session.replayCount,
      ].join("/"),
    },
);

function cachedOfReview<
  K extends "getProject" | "getReviewSummary" | "listFlashcards",
>(root: RootState, endpointName: K) {
  const projectId = selectReviewProjectId(root);
  return projectId === null
    ? undefined
    : cacheEntry(root.backend, endpointName, projectId)?.data;
}

/** The shown card with its flashcard's content as the list holds it, or null while there is none to show. */
function shownCardOf(
  shown: SessionCard | null,
  flashcards: readonly Flashcard[] | undefined,
): ReviewQueueCard | null {
  const flashcard =
    shown && flashcards?.find(({ id }) => id === shown.flashcardId);
  if (!shown || !flashcard) return null;
  return { flashcard, state: shown.state, intervals: shown.intervals };
}

/** How often the user forgot a leech, or null for a card that is no leech. */
function leechLapseCountOf(card: SessionCard | null) {
  return card?.state?.is_leech ? card.state.lapses : null;
}

function progressOf(session: ReviewScreenState): ReviewSessionProgress {
  const left = [
    ...(session.shown ? [session.shown] : []),
    ...session.queue,
    ...session.comingBack,
  ];
  const finished = answersOf(session.steps).length;
  return {
    finished,
    total: finished + left.length,
    newCount: left.filter(({ state }) => state === null).length,
    learningCount: left.filter(
      ({ state }) => state !== null && state.state !== "review",
    ).length,
    dueCount: left.filter(({ state }) => state?.state === "review").length,
  };
}

function endOf(
  session: ReviewScreenState,
  project: Project | undefined,
  summary: ReviewSummary | undefined,
): ReviewEnd | null {
  if (session.shown !== null || session.queueStatus === "loading") return null;
  if (session.queueStatus === "failed") return { kind: "failed" };
  const reviewedCount = answersOf(session.steps).length;
  const heldBackCount = summary?.held_back_count ?? 0;
  if (reviewedCount > 0 || heldBackCount > 0)
    return {
      kind: "doneForToday",
      reviewedCount,
      comesBack: comesBackOf(session.comingBack),
      // New cards are paused while reviews are held back, so none are offered then.
      moreNewCount:
        heldBackCount > 0
          ? 0
          : Math.min(extraNewCardCount, project?.unreviewed_count ?? 0),
      heldBackCount,
      moreReviewCount: Math.min(extraReviewCount, heldBackCount),
    };
  if (project?.flashcard_count === 0) return { kind: "noFlashcards" };
  return { kind: "nothingDue", nextDueAtMs: summary?.next_due_at_ms ?? null };
}

function comesBackOf(comingBack: readonly SessionCard[]) {
  const atMs = comingBack[0]?.state?.due_at_ms;
  return atMs === undefined ? null : { count: comingBack.length, atMs };
}
