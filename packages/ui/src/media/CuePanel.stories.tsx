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
        className="h-[32rem] w-96 overflow-hidden rounded-lg bg-canvas text-fg"
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
    onWordHover: fn(),
    onWordClick: fn(),
    onAddSubtitlesFile: fn(),
    onGenerateSubtitles: fn(),
  },
} satisfies Meta<typeof CuePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DualSubtitles: Story = {};

export const TargetOnly: Story = { args: { translationCues: [] } };

export const WordUnderPointer: Story = { args: { activeWord: "fressen" } };

export const NoSubtitles: Story = { args: { cues: [] } };
