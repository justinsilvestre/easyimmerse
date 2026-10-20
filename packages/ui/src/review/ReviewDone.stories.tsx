import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ReviewDone } from "./ReviewDone.tsx";

const hourMs = 60 * 60 * 1000;

const meta = {
  title: "Review/ReviewDone",
  component: ReviewDone,
  args: {
    end: {
      kind: "doneForToday",
      reviewedCount: 13,
      comesBack: null,
      moreNewCount: 0,
      heldBackCount: 0,
      moreReviewCount: 0,
    },
    onBack: fn(),
    onLearnMore: fn(),
    onReviewMore: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof ReviewDone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DoneForToday: Story = {};

/** A card the user forgot is still being learned and comes back later today, and new cards remain beyond today's twenty. */
export const DoneWithACardComingBack: Story = {
  args: {
    end: {
      kind: "doneForToday",
      reviewedCount: 13,
      comesBack: { count: 1, atMs: Date.now() + 2 * hourMs },
      moreNewCount: 20,
      heldBackCount: 0,
      moreReviewCount: 0,
    },
  },
};

/** The day's limit of reviews is reached, and more are due: they wait for the next days, and new cards are paused. */
export const DoneWithABacklog: Story = {
  args: {
    end: {
      kind: "doneForToday",
      reviewedCount: 200,
      comesBack: null,
      moreNewCount: 0,
      heldBackCount: 340,
      moreReviewCount: 100,
    },
  },
};

/** The user comes back on a day whose limit they already reached, with reviews still held back. */
export const LimitReachedEarlierToday: Story = {
  args: {
    end: {
      kind: "doneForToday",
      reviewedCount: 0,
      comesBack: null,
      moreNewCount: 0,
      heldBackCount: 1,
      moreReviewCount: 1,
    },
  },
};

export const NothingToReview: Story = {
  args: { end: { kind: "nothingDue", nextDueAtMs: Date.now() + 24 * hourMs } },
};

export const NoFlashcardsYet: Story = {
  args: { end: { kind: "noFlashcards" } },
};

/** The session's cards could not be loaded, as when the server cannot be reached. */
export const FailedToLoad: Story = {
  args: { end: { kind: "failed" } },
};
