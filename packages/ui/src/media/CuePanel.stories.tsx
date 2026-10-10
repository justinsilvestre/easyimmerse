import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CuePanel } from "./CuePanel.tsx";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleFlashcardWordRanges,
  exampleTranslationCues,
} from "./exampleCues.ts";

/** How far apart the repeats of the example scene start, just past its last line. */
const sceneMs = 24_000;

const meta = {
  title: "Media/CuePanel",
  component: CuePanel,
  decorators: [
    (Story) => (
      <div className="flex h-[32rem] w-96 flex-col overflow-hidden rounded-lg bg-canvas text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    cues: exampleCues,
    translationCues: exampleTranslationCues,
    activeCueIndex: 3,
    flashcardCueIndexes: [],
    onSeek: fn(),
    onOpenFlashcardForCue: fn(),
    wordGestures: {
      onWordClick: fn(),
      onWordDoubleClick: fn(),
      onWordHold: fn(),
    },
    onAddSubtitlesFile: fn(),
    onGenerateSubtitles: fn(),
  },
} satisfies Meta<typeof CuePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DualSubtitles: Story = {};

/** Some lines already have a flashcard, which opens from the mark beside their time; the word it was made from is underlined. */
export const WithFlashcards: Story = {
  args: {
    flashcardCueIndexes: exampleFlashcardCueIndexes,
    flashcardWordRanges: exampleFlashcardWordRanges,
  },
};

export const TargetOnly: Story = { args: { translationCues: [] } };

/** The lookup cursor on "gib", where Right moved it from a focused word; the mouse's cursor looks the same. */
export const WithLookupCursor: Story = {
  args: {
    cursor: { cueIndex: 4, start: 5, input: "keyboard", matchedLength: 3 },
  },
};

export const WordInPopup: Story = {
  args: { activeWord: { cueIndex: 3, start: 13, popupId: "dictionary" } },
};

/** The scene played four times over, enough lines that the list scrolls; scroll away from the current line to see the way back. */
export const LongScene: Story = {
  args: {
    cues: repeatScene(exampleCues, 4),
    translationCues: repeatScene(exampleTranslationCues, 4),
    activeCueIndex: 14,
  },
};

/** Japanese lines, written without spaces, whose long runs wrap across lines like the text around them. */
export const JapaneseSubtitles: Story = {
  args: {
    cues: [
      {
        index: 1,
        start_ms: 500,
        end_ms: 4200,
        text: "だから解釈の幅が揺れすぎないようにある程度のラインも定めているんですね。",
      },
      {
        index: 2,
        start_ms: 4600,
        end_ms: 9000,
        text: "なるほどね。だからイワし雲ってのは秋の空に浮かぶ雲のことなんだ。",
      },
    ],
    translationCues: [],
    activeCueIndex: 2,
  },
};

export const NoSubtitles: Story = { args: { cues: [] } };

function repeatScene(cues: readonly Cue[], times: number): Cue[] {
  return Array.from({ length: times }, (_, round) =>
    cues.map((cue) => ({
      ...cue,
      index: cue.index + round * cues.length,
      start_ms: cue.start_ms + round * sceneMs,
      end_ms: cue.end_ms + round * sceneMs,
    })),
  ).flat();
}
