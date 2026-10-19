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
    },
    onBack: fn(),
    onLearnMore: fn(),
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
