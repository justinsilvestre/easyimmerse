import type { ReviewSummary } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleProject } from "../server/exampleProject.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../server/serverCacheWith.ts";
import {
  answerLanded,
  exampleCardState,
  exampleQueueCard,
  openReview,
  queueArrived,
  queueFailed,
  rated,
} from "./reviewTestSupport.ts";
import { selectReviewSession } from "./selectReviewSession.ts";

const minuteMs = 60 * 1000;
const a = exampleQueueCard("a", "review");
const b = exampleQueueCard("b", "learning");
const c = exampleQueueCard("c");

const summary: ReviewSummary = {
  due_count: 0,
  learning_count: 0,
  new_count: 0,
  held_back_count: 0,
  next_due_at_ms: 86_400_000,
  next_card: null,
  has_progress: true,
};

/** p1 with the given counts, and its review's summary with the reviews it holds back. */
const cacheOf = (
  flashcardCount: number,
  unreviewedCount = 0,
  heldBackCount = 0,
) =>
  serverCacheWith(
    "getProject",
    "p1",
    {
      ...exampleProject("p1"),
      flashcard_count: flashcardCount,
      unreviewed_count: unreviewedCount,
    },
    serverCacheWith("getReviewSummary", "p1", {
      ...summary,
      held_back_count: heldBackCount,
    }),
  );

const sessionOf = (backend: ServerCacheSlice, ...given: AppAction[]) =>
  selectReviewSession({
    app: stateAfterWithCache(backend, openReview, ...given),
    backend,
  });

const viewOf = (...given: AppAction[]) => sessionOf(cacheOf(3), ...given);

describe("selectReviewSession", () => {
  it("is null while the review is not the main screen", () => {
    const backend = emptyServerCache;
    expect(
      selectReviewSession({ app: stateAfterWithCache(backend), backend }),
    ).toBeNull();
  });

  it("counts the cards left by kind, the shown one included", () => {
    expect(viewOf(queueArrived(a, b, c))?.progress).toEqual({
      finished: 0,
      total: 3,
      newCount: 1,
      learningCount: 1,
      dueCount: 1,
    });
  });

  it("shows no end while the queue loads", () => {
    expect(viewOf()?.end).toBeNull();
  });

  it("tells that the queue failed to load", () => {
    expect(viewOf(queueFailed)?.end).toEqual({ kind: "failed" });
  });

  it("tells when the next review is due when nothing is due now", () => {
    expect(viewOf(queueArrived())?.end).toEqual({
      kind: "nothingDue",
      nextDueAtMs: 86_400_000,
    });
  });

  it("tells that the project has no flashcards", () => {
    expect(sessionOf(cacheOf(0), queueArrived())?.end).toEqual({
      kind: "noFlashcards",
    });
  });

  describe("once every card is rated", () => {
    const done = (unreviewedCount: number, ...landed: AppAction[]) =>
      sessionOf(
        cacheOf(30, unreviewedCount),
        queueArrived(a),
        ...rated("again", 0),
        ...landed,
        queueArrived(),
      )?.end;

    it("tells how many cards were reviewed and offers twenty more new cards", () => {
      expect(done(25, answerLanded("a", 7))).toEqual({
        kind: "doneForToday",
        reviewedCount: 1,
        comesBack: null,
        moreNewCount: 20,
        heldBackCount: 0,
        moreReviewCount: 0,
      });
    });

    it("offers only the new cards left", () => {
      expect(done(5, answerLanded("a", 7))).toMatchObject({ moreNewCount: 5 });
    });

    it("tells when a card being learned comes back later today", () => {
      expect(
        done(0, answerLanded("a", 7, "relearning", 60 * minuteMs)),
      ).toMatchObject({ comesBack: { count: 1, atMs: 60 * minuteMs } });
    });
  });

  describe("when the day's limit holds reviews back", () => {
    it("offers a hundred more reviews", () => {
      expect(
        sessionOf(cacheOf(300, 0, 140), queueArrived())?.end,
      ).toMatchObject({ kind: "doneForToday", moreReviewCount: 100 });
    });

    it("offers only the reviews held back", () => {
      expect(sessionOf(cacheOf(300, 0, 40), queueArrived())?.end).toMatchObject(
        { heldBackCount: 40, moreReviewCount: 40 },
      );
    });
  });

  it("tells how often a leech was forgotten", () => {
    const leech = {
      ...a,
      state: { ...exampleCardState("review"), lapses: 9, is_leech: true },
    };
    expect(viewOf(queueArrived(leech))?.leechLapseCount).toBe(9);
  });

  it("tells of no leech for a card that is none", () => {
    expect(viewOf(queueArrived(a))?.leechLapseCount).toBeNull();
  });

  it("offers no Undo before an answer lands", () => {
    expect(viewOf(queueArrived(a, b), ...rated("good"))?.canUndo).toBe(false);
  });

  it("offers Undo once an answer lands", () => {
    expect(
      viewOf(queueArrived(a, b), ...rated("good"), answerLanded("a", 7))
        ?.canUndo,
    ).toBe(true);
  });
});
