import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CuePanel } from "./CuePanel.tsx";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleTranslationCues,
} from "./exampleCues.ts";

const meta = {
  title: "Media/CuePanel",
  component: CuePanel,
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        className="flex h-[32rem] w-96 flex-col overflow-hidden rounded-lg bg-canvas text-fg"
      >
        <Story />
      </div>
    ),
  ],
  args: {
    cues: exampleCues,
    translationCues: exampleTranslationCues,
    activeCueIndex: 3,
    flashcardCueIndexes: exampleFlashcardCueIndexes,
    onSeek: fn(),
    wordGestures: {
      onWordClick: fn(),
      onWordDoubleClick: fn(),
      onWordHoverIntent: fn(),
      onWordHold: fn(),
    },
    onAddSubtitlesFile: fn(),
    onGenerateSubtitles: fn(),
  },
} satisfies Meta<typeof CuePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DualSubtitles: Story = {};

export const TargetOnly: Story = { args: { translationCues: [] } };

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

export const NoSubtitles: Story = { args: { cues: [] } };

/** How far apart the repeats of the example scene start, just past its last line. */
const sceneMs = 24_000;

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
