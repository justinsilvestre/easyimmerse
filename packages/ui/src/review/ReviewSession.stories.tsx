import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";
import { exampleReviewCard } from "./exampleReviewCards.ts";
import { ReviewSession } from "./ReviewSession.tsx";

const meta = {
  title: "Review/ReviewSession",
  component: ReviewSession,
  decorators: [
    (Story) => (
      <div className="flex w-[min(48rem,calc(100vw-2rem))] flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    card: exampleReviewCard,
    leechLapseCount: null,
    isScreenshotExpanded: false,
    stage: "front",
    end: null,
    includedFields: fieldsOfPreset("intermediate"),
    frontFields: frontFieldsOfPreset("intermediate"),
    languages: exampleLanguages,
    audioPlayKey: "f1",
    onReplayAudio: fn(),
    onExpandScreenshot: fn(),
    onCloseScreenshot: fn(),
    onSuspend: fn(),
    onBack: fn(),
    onLearnMore: fn(),
    onReviewMore: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof ReviewSession>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Front: Story = {};

export const Revealed: Story = {
  args: { stage: "back" },
};

/** A card the user keeps forgetting, flagged as a leech above it. */
export const Leech: Story = {
  args: { leechLapseCount: 8 },
};

export const Ended: Story = {
  args: {
    card: null,
    end: {
      kind: "doneForToday",
      reviewedCount: 13,
      comesBack: null,
      moreNewCount: 0,
      heldBackCount: 0,
      moreReviewCount: 0,
    },
  },
};
