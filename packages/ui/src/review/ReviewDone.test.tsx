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
    it("says that they come up over the next days and that new cards are paused", () => {
      renderDone(doneWithBacklog);
      expect(
        screen.getByText(
          "Another 340 reviews are due, more than the daily limit. They come up over the next few days, and new cards are paused until you have caught up.",
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

  it("leaves out the count of reviews when none were given in the session", () => {
    renderDone({ ...doneWithBacklog, reviewedCount: 0 });
    expect(screen.queryByText(/You reviewed/)).toBeNull();
  });
});
