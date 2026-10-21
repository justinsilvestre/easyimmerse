import type { ReviewEnd } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewDone } from "./ReviewDone.tsx";

afterEach(cleanup);

const doneWithBacklog: ReviewEnd = {
  kind: "doneForToday",
  reviewedCount: 200,
  comesBack: null,
  moreNewCount: 0,
  heldBackCount: 340,
  moreReviewCount: 100,
};

const renderDone = (
  end: ReviewEnd,
  onReviewMore: (count: number) => void = () => {},
) =>
  render(
    <ReviewDone
      end={end}
      onBack={() => {}}
      onLearnMore={() => {}}
      onReviewMore={onReviewMore}
      onRetry={() => {}}
    />,
  );

describe("ReviewDone", () => {
  describe("when the day's limit holds reviews back", () => {
    it("says that they come up in the coming days and that new cards are paused", () => {
      renderDone(doneWithBacklog);
      expect(
        screen.getByText(
          "Another 340 reviews are due beyond today's limit. They will be distributed across the next few days' review sessions, and new cards are paused until you have caught up.",
        ),
      ).toBeTruthy();
    });

    it("reviews as many more as it offers", () => {
      const onReviewMore = vi.fn();
      renderDone(doneWithBacklog, onReviewMore);
      fireEvent.click(
        screen.getByRole("button", { name: "Review 100 more now" }),
      );
      expect(onReviewMore).toHaveBeenCalledWith(100);
    });
  });

  describe("when cards being learned come back later today", () => {
    it("says when one card is due again", () => {
      renderDone({
        ...doneWithBacklog,
        comesBack: { count: 1, atMs: new Date(2026, 9, 21, 16, 40).getTime() },
      });
      expect(
        screen.getByText(/^1 card you are still learning is due again at /),
      ).toBeTruthy();
    });

    it("says when the first of several cards is due again", () => {
      renderDone({
        ...doneWithBacklog,
        comesBack: { count: 3, atMs: new Date(2026, 9, 21, 16, 40).getTime() },
      });
      expect(
        screen.getByText(
          /^3 cards you are still learning are due again later today, the first at /,
        ),
      ).toBeTruthy();
    });
  });

  it("leaves out the count of reviews when none were given in the session", () => {
    renderDone({ ...doneWithBacklog, reviewedCount: 0 });
    expect(screen.queryByText(/You reviewed/)).toBeNull();
  });
});
