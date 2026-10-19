import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  fetchQueue,
  raiseAllowance,
  sendHold,
  sendLift,
  sendUndo,
} from "./reviewRequests.ts";
import {
  answerFailed,
  answerLanded,
  exampleQueueCard,
  holdSettled,
  liftSettled,
  openReview,
  queueArrived,
  queueFailed,
  rated,
  reviewAfter,
  undoSettled,
} from "./reviewTestSupport.ts";
import { updateReviewScreen } from "./updateReviewScreen.ts";

const minuteMs = 60 * 1000;
const a = exampleQueueCard("a", "review");
const b = exampleQueueCard("b", "learning");
const c = exampleQueueCard("c");
const arrived = queueArrived(a, b, c);

const shownId = (...given: Parameters<typeof reviewAfter>) =>
  reviewAfter(...given).shown?.flashcard.id ?? null;

const effectsOf = (
  action: Parameters<typeof updateReviewScreen>[1],
  ...before: Parameters<typeof reviewAfter>
) => updateReviewScreen(reviewAfter(...before), action, "p1")[1];

describe("updateReviewScreen", () => {
  describe("when the queue arrives", () => {
    it("shows its first card", () => {
      expect(shownId(arrived)).toBe("a");
    });

    it("keeps the rest of it to show next", () => {
      const queue = reviewAfter(arrived).queue.map(
        ({ flashcard }) => flashcard.id,
      );
      expect(queue).toEqual(["b", "c"]);
    });

    it("shows the card from its front", () => {
      expect(reviewAfter(arrived).stage).toBe("front");
    });
  });

  it("tells that the queue failed to load", () => {
    expect(reviewAfter(queueFailed).queueStatus).toBe("failed");
  });

  it("loads the queue again on Retry", () => {
    expect(effectsOf(actions.reviewQueueRetried(), queueFailed)).toEqual([
      fetchQueue("p1"),
    ]);
  });

  it("shows the back of the card on request", () => {
    expect(reviewAfter(arrived, actions.reviewAnswerShown(0)).stage).toBe(
      "back",
    );
  });

  it("ignores a rating before the back is shown", () => {
    expect(shownId(arrived, actions.reviewRated("good", 0))).toBe("a");
  });

  it("shows the next card once the shown one is rated", () => {
    expect(shownId(arrived, ...rated("good"))).toBe("b");
  });

  it("keeps the rating for Undo", () => {
    expect(reviewAfter(arrived, ...rated("good")).steps).toEqual([
      { kind: "answer", card: a, answeredAtMs: null },
    ]);
  });

  describe("when a card is rated", () => {
    it("times the first card from when its back was shown", () => {
      const effects = effectsOf(
        actions.reviewRated("again", 4000),
        arrived,
        actions.reviewAnswerShown(1000),
      );
      expect(effects).toEqual([
        {
          type: "sendRequestWithFreeId",
          prefix: "review/p1/answer",
          scope: "review:p1",
          request: {
            kind: "answerReview",
            projectId: "p1",
            flashcardId: "a",
            rating: "again",
            durationMs: 3000,
          },
        },
      ]);
    });

    it("times a later card from the rating before it", () => {
      const [effect] = effectsOf(
        actions.reviewRated("good", 5000),
        arrived,
        ...rated("good", 1000),
        actions.reviewAnswerShown(3000),
      );
      expect(effect).toMatchObject({ request: { durationMs: 4000 } });
    });

    it("fetches the queue again once the session runs out of cards", () => {
      const [, fetch] = effectsOf(
        actions.reviewRated("good", 0),
        queueArrived(a),
        actions.reviewAnswerShown(0),
      );
      expect(fetch).toEqual(fetchQueue("p1"));
    });
  });

  describe("when an answer lands", () => {
    it("names the answer by its log entry for Undo", () => {
      const review = reviewAfter(
        arrived,
        ...rated("good"),
        answerLanded("a", 7),
      );
      expect(review.steps[0]).toMatchObject({ answeredAtMs: 7 });
    });

    it("brings back a card that the answer leaves in a learning step", () => {
      const review = reviewAfter(
        arrived,
        ...rated("again"),
        answerLanded("a", 7, "relearning", 10 * minuteMs),
      );
      expect(review.comingBack.map(({ flashcard }) => flashcard.id)).toEqual([
        "a",
      ]);
    });

    it("lets a card under review go", () => {
      const review = reviewAfter(
        arrived,
        ...rated("good"),
        answerLanded("a", 7),
      );
      expect(review.comingBack).toEqual([]);
    });

    it("puts the card of a failed answer back in the queue", () => {
      const review = reviewAfter(arrived, ...rated("good"), answerFailed("a"));
      expect(review.queue[0]?.flashcard.id).toBe("a");
    });
  });

  describe("when a card comes back", () => {
    const again = [
      arrived,
      ...rated("again", 0),
      answerLanded("a", 7, "relearning", 10 * minuteMs),
    ];

    it("shows it ahead of the queue once it is due", () => {
      expect(shownId(...again, ...rated("good", 11 * minuteMs))).toBe("a");
    });

    it("shows the queue's next card while it is not due yet", () => {
      expect(shownId(...again, ...rated("good", minuteMs))).toBe("c");
    });

    it("shows it early once nothing else is left", () => {
      expect(
        shownId(
          ...again,
          ...rated("good", minuteMs),
          ...rated("good", minuteMs),
        ),
      ).toBe("a");
    });

    it("leaves it for later when it is not due within twenty minutes", () => {
      const later = [
        queueArrived(a, b),
        ...rated("again", 0),
        answerLanded("a", 7, "relearning", 60 * minuteMs),
      ];
      expect(shownId(...later, ...rated("good", minuteMs))).toBeNull();
    });

    it("gives way to the same card in a queue fetched again", () => {
      const review = reviewAfter(
        queueArrived(a),
        ...rated("again", 0),
        answerLanded("a", 7, "relearning", 10 * minuteMs),
        queueArrived(exampleQueueCard("a", "relearning", 10 * minuteMs)),
      );
      expect(review.comingBack).toEqual([]);
    });
  });

  describe("on Undo", () => {
    const landed = [arrived, ...rated("good"), answerLanded("a", 7)];

    it("sends the undo of the latest answer", () => {
      expect(effectsOf(actions.reviewUndoRequested(), ...landed)).toEqual([
        sendUndo("p1", 7),
      ]);
    });

    it("waits for the latest answer to land", () => {
      expect(
        effectsOf(actions.reviewUndoRequested(), arrived, ...rated("good")),
      ).toEqual([]);
    });

    it("shows the card again once the undo lands", () => {
      expect(
        shownId(...landed, actions.reviewUndoRequested(), undoSettled(7)),
      ).toBe("a");
    });

    it("puts the card that was shown back at the front of the queue", () => {
      const review = reviewAfter(
        ...landed,
        actions.reviewUndoRequested(),
        undoSettled(7),
      );
      expect(review.queue[0]?.flashcard.id).toBe("b");
    });

    it("forgets the undone rating", () => {
      const review = reviewAfter(
        ...landed,
        actions.reviewUndoRequested(),
        undoSettled(7),
      );
      expect(review.steps).toEqual([]);
    });

    it("keeps the rating when the undo fails", () => {
      const review = reviewAfter(
        ...landed,
        actions.reviewUndoRequested(),
        undoSettled(7, false),
      );
      expect(review.steps).toHaveLength(1);
    });
  });

  it("plays the card's audio again on request", () => {
    expect(
      reviewAfter(arrived, actions.reviewAudioReplayed()).replayCount,
    ).toBe(1);
  });

  it("raises today's allowance of new cards and fetches the queue again", () => {
    expect(effectsOf(actions.reviewAllowanceRaised(), queueArrived())).toEqual([
      raiseAllowance("p1", { newCards: 20, reviews: 0 }),
      fetchQueue("p1"),
    ]);
  });

  it("raises today's allowance of reviews and fetches the queue again", () => {
    expect(
      effectsOf(actions.reviewMoreReviewsRequested(), queueArrived()),
    ).toEqual([
      raiseAllowance("p1", { newCards: 0, reviews: 100 }),
      fetchQueue("p1"),
    ]);
  });

  describe("on burying the shown card", () => {
    const buried = actions.reviewCardHeld("buried", 0);

    it("sends the bury", () => {
      expect(effectsOf(buried, arrived)).toEqual([
        sendHold("p1", "a", "buried"),
      ]);
    });

    it("shows the next card", () => {
      expect(shownId(arrived, buried)).toBe("b");
    });

    it("keeps the bury for Undo", () => {
      expect(reviewAfter(arrived, buried).steps).toEqual([
        { kind: "hold", card: a, hold: "buried", hasLanded: false },
      ]);
    });

    it("puts the card back in the queue when the bury fails", () => {
      const review = reviewAfter(
        arrived,
        buried,
        holdSettled("a", "buried", false),
      );
      expect(review.queue[0]?.flashcard.id).toBe("a");
    });
  });

  describe("on undoing a suspension", () => {
    const suspended = [
      arrived,
      actions.reviewCardHeld("suspended", 0),
      holdSettled("a", "suspended"),
    ];

    it("brings the card back into the review", () => {
      expect(effectsOf(actions.reviewUndoRequested(), ...suspended)).toEqual([
        sendLift("p1", "a"),
      ]);
    });

    it("waits for the suspension to land", () => {
      expect(
        effectsOf(
          actions.reviewUndoRequested(),
          arrived,
          actions.reviewCardHeld("suspended", 0),
        ),
      ).toEqual([]);
    });

    it("shows the card again once the lift lands", () => {
      expect(
        shownId(...suspended, actions.reviewUndoRequested(), liftSettled("a")),
      ).toBe("a");
    });

    it("forgets the undone suspension", () => {
      const review = reviewAfter(
        ...suspended,
        actions.reviewUndoRequested(),
        liftSettled("a"),
      );
      expect(review.steps).toEqual([]);
    });
  });

  describe("on tapping the screenshot", () => {
    it("shows it at full size", () => {
      expect(
        reviewAfter(arrived, actions.reviewScreenshotExpanded())
          .isScreenshotExpanded,
      ).toBe(true);
    });

    it("closes it again", () => {
      const review = reviewAfter(
        arrived,
        actions.reviewScreenshotExpanded(),
        actions.reviewScreenshotClosed(),
      );
      expect(review.isScreenshotExpanded).toBe(false);
    });

    it("closes it with the next card", () => {
      const review = reviewAfter(
        arrived,
        actions.reviewScreenshotExpanded(),
        ...rated("good"),
      );
      expect(review.isScreenshotExpanded).toBe(false);
    });
  });

  describe("on deleting the shown card", () => {
    it("asks first", () => {
      const review = reviewAfter(
        arrived,
        actions.reviewFlashcardDeleteRequested(),
      );
      expect(review.isConfirmingDelete).toBe(true);
    });

    it("deletes it once confirmed", () => {
      const [deletion] = effectsOf(
        actions.reviewFlashcardDeleteConfirmed(0),
        arrived,
        actions.reviewFlashcardDeleteRequested(),
      );
      expect(deletion).toMatchObject({
        request: { kind: "deleteFlashcard", flashcardId: "a" },
      });
    });

    it("shows the next card", () => {
      expect(
        shownId(
          arrived,
          actions.reviewFlashcardDeleteRequested(),
          actions.reviewFlashcardDeleteConfirmed(0),
        ),
      ).toBe("b");
    });
  });

  describe("on editing the shown card", () => {
    const editing = () =>
      stateAfter(openReview, arrived, actions.reviewFlashcardEditRequested());

    it("goes to the screen of its media file", () => {
      expect(editing().route).toEqual({
        screen: "media",
        projectId: "p1",
        mediaFileId: "m1",
      });
    });

    it("opens it in the editor there", () => {
      const { main } = editing().screen;
      expect(main.kind === "media" && main.flashcardForm?.card).toMatchObject({
        kind: "existing",
        flashcard: { id: "a" },
      });
    });
  });
});
