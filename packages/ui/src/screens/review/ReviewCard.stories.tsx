import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLanguages } from "../../components/flashcards/exampleFlashcard.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../projectSettings/flashcardPresets.ts";
import {
  ebookReviewCard,
  exampleReviewCard,
  longReviewCard,
} from "./exampleReviewCards.ts";
import { ReviewCard } from "./ReviewCard.tsx";

const meta = {
  title: "Screens/Review/ReviewCard",
  component: ReviewCard,
  decorators: [
    (Story) => (
      <div className="flex w-[min(40rem,calc(100vw-2rem))] flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    content: exampleReviewCard.content,
    screenshotUrl: exampleReviewCard.screenshotUrl,
    includedFields: fieldsOfPreset("intermediate"),
    frontFields: frontFieldsOfPreset("intermediate"),
    languages: exampleLanguages,
    isRevealed: false,
    isMediaUnavailable: false,
    onPlayAudio: fn(),
    onExpandScreenshot: fn(),
  },
} satisfies Meta<typeof ReviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The front of a card from a video, with its screenshot and sentence audio. */
export const Front: Story = {};

export const Revealed: Story = {
  args: { isRevealed: true },
};

/** The card's media file cannot be read on this device, so its audio and screenshot are left out and the front falls back to the word and the sentence. */
export const MediaUnavailable: Story = {
  args: { isRevealed: true, isMediaUnavailable: true },
};

/** A card from an ebook has no audio or screenshot. */
export const TextOnly: Story = {
  args: {
    content: ebookReviewCard.content,
    screenshotUrl: null,
    isRevealed: true,
  },
};

export const LongContent: Story = {
  args: {
    content: longReviewCard.content,
    includedFields: fieldsOfPreset("advanced"),
    frontFields: frontFieldsOfPreset("advanced"),
    isRevealed: true,
  },
};
