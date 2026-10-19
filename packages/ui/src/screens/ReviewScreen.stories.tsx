import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";
import {
  ebookReviewCard,
  exampleReviewCard,
  longReviewCard,
} from "../review/exampleReviewCards.ts";
import { ReviewScreen } from "./ReviewScreen.tsx";

const hourMs = 60 * 60 * 1000;

/** The intervals FSRS gives a card in review for some weeks, as the four buttons would schedule it. */
const matureIntervals = {
  again: "10 min",
  hard: "2 weeks",
  good: "1 month",
  easy: "3 months",
};

const meta = {
  title: "Review/ReviewScreen",
  component: ReviewScreen,
  parameters: { layout: "fullscreen" },
  args: {
    projectName: "German series",
    card: exampleReviewCard,
    stage: "front",
    buttons: "two",
    progress: {
      finished: 4,
      total: 16,
      newCount: 3,
      learningCount: 1,
      dueCount: 8,
    },
    intervals: matureIntervals,
    end: null,
    canUndo: false,
    includedFields: fieldsOfPreset("intermediate"),
    frontFields: frontFieldsOfPreset("intermediate"),
    languages: exampleLanguages,
    onShowAnswer: fn(),
    onRate: fn(),
    onReplayAudio: fn(),
    onUndo: fn(),
    onBack: fn(),
    onLearnMore: fn(),
    onRetry: fn(),
    audioPlayKey: "f1",
    onEditFlashcard: fn(),
    onDeleteFlashcard: fn(),
  },
} satisfies Meta<typeof ReviewScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The front of a card from a video, before the answer is shown: its screenshot and sentence audio. */
export const Front: Story = {};

/** The answer shown, with the two buttons the review offers by default. */
export const RevealedWithTwoButtons: Story = {
  args: { stage: "back" },
};

/** The answer shown, with Anki's four buttons. */
export const RevealedWithFourButtons: Story = {
  args: { stage: "back", buttons: "four" },
};

/** The card's media file cannot be read on this device, so its audio and screenshot are left out. */
export const MediaUnavailable: Story = {
  args: {
    stage: "back",
    card: { ...exampleReviewCard, isMediaUnavailable: true },
  },
};

/** A card made in the reader from an ebook, which has no audio or screenshot. */
export const TextOnly: Story = {
  args: { stage: "back", card: ebookReviewCard },
};

/** A revealed card taller than the window scrolls above the controls. */
export const LongContent: Story = {
  args: {
    stage: "back",
    card: longReviewCard,
    includedFields: fieldsOfPreset("advanced"),
    frontFields: frontFieldsOfPreset("advanced"),
  },
};

export const OnASmallPhone: Story = {
  parameters: { viewport: { options: INITIAL_VIEWPORTS } },
  globals: { viewport: { value: "iphonex", isRotated: false } },
  args: { stage: "back", buttons: "four" },
};

/** After a rating in this session, Undo is available. */
export const UndoAvailable: Story = {
  args: { canUndo: true },
};

export const DoneForToday: Story = {
  args: {
    card: null,
    canUndo: true,
    end: {
      kind: "doneForToday",
      reviewedCount: 13,
      comesBack: { count: 1, atMs: Date.now() + 2 * hourMs },
      moreNewCount: 20,
    },
  },
};

export const NothingToReview: Story = {
  args: {
    card: null,
    end: { kind: "nothingDue", nextDueAtMs: Date.now() + 24 * hourMs },
  },
};

export const NoFlashcardsYet: Story = {
  args: { card: null, end: { kind: "noFlashcards" } },
};

/** The session's cards could not be loaded. */
export const FailedToLoad: Story = {
  args: { card: null, end: { kind: "failed" } },
};

/** The card's media file is gone from the project, so the More menu offers no way to edit it. */
export const WithoutEdit: StoryObj<typeof ReviewScreen> = {
  args: { onEditFlashcard: null, card: ebookReviewCard },
};
