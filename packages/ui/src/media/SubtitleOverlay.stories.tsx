import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleCues,
  exampleFlashcardWordRanges,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { SubtitleOverlay } from "./SubtitleOverlay.tsx";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

const twoLineCue = exampleCues[2] as Cue;

const meta = {
  title: "Media/SubtitleOverlay",
  component: SubtitleOverlay,
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        className="@container relative flex h-80 w-full max-w-3xl flex-col justify-end bg-linear-to-br from-sky-800 via-slate-500 to-amber-200"
      >
        <Story />
      </div>
    ),
  ],
  args: {
    targetCue: twoLineCue,
    translationCue: exampleTranslationCues[2] as Cue,
    display: "both",
    appearance: defaultSubtitleAppearance,
    wordGestures: { onWordClick: fn(), onWordDoubleClick: fn() },
  },
} satisfies Meta<typeof SubtitleOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BothLanguages: Story = {};

/** A cue of one line keeps the box at the height of the cue of two lines before it. */
export const OneLineCue: Story = {
  args: {
    targetCue: exampleCues[3] as Cue,
    translationCue: exampleTranslationCues[3] as Cue,
  },
};

export const TargetOnly: Story = { args: { display: "target" } };

export const WithFlashcardWord: Story = {
  args: { flashcardWordRanges: exampleFlashcardWordRanges.get(3) },
};

export const HighContrast: Story = {
  args: {
    appearance: {
      boxColor: "white",
      boxOpacity: 100,
      textShadow: "none",
      textSizeStep: 4,
      textColor: "black",
    },
  },
};
