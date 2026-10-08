import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleCues,
  exampleFlashcardWordRanges,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { SubtitleBand } from "./SubtitleBand.tsx";
import { SubtitleOverlay } from "./SubtitleOverlay.tsx";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

const twoLineCue = exampleCues[2] as Cue;

const meta = {
  title: "Media/SubtitleOverlay",
  component: SubtitleOverlay,
  decorators: [
    (Story, { args }) => (
      <div
        data-theme="dark"
        className="@container relative flex h-80 w-3xl max-w-full flex-col justify-end bg-linear-to-br from-sky-800 via-slate-500 to-amber-200"
      >
        <SubtitleBand
          placement="overlay"
          appearance={args.appearance}
          controlsHeight={0}
        >
          <Story />
        </SubtitleBand>
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

/** The lookup cursor on "Hund", where Right moved it from a focused word; the mouse's cursor looks the same. */
export const WithLookupCursor: Story = {
  args: {
    cursor: { cueIndex: 3, start: 4, input: "keyboard", matchedLength: 4 },
  },
};

export const WithFlashcardWord: Story = {
  args: { flashcardWordRanges: exampleFlashcardWordRanges.get(3) },
};

export const HighContrast: Story = {
  args: {
    appearance: {
      backgroundOpacity: 100,
      textShadow: "heavy",
      textSizeStep: 3,
      textColor: "yellow",
    },
  },
};

/** Japanese, whose words are buttons that must keep the shadow of the text around them. */
export const JapaneseCue: Story = {
  args: {
    targetCue: {
      index: 1,
      start_ms: 0,
      end_ms: 3000,
      text: "今日はいい天気ですね。\n散歩に行きましょうか？",
    },
    translationCue: {
      index: 1,
      start_ms: 0,
      end_ms: 3000,
      text: "Nice weather today. Shall we go for a walk?",
    },
  },
};

/** A cue longer than the two lines the box keeps room for, which grows upward over the picture. */
export const FourLineCue: Story = {
  args: {
    targetCue: {
      index: 3,
      start_ms: 5400,
      end_ms: 8200,
      text: "Der Hund will fressen.\nEr hat Hunger.\nGib ihm etwas,\nbevor er bellt.",
    },
  },
};
