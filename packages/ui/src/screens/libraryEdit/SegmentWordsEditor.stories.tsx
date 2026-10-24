import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import {
  exampleLibraryDocumentText,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import { SegmentWordsEditor } from "./SegmentWordsEditor.tsx";

const meta = {
  title: "Screens/Library Edit/SegmentWordsEditor",
  component: SegmentWordsEditor,
  decorators: [withAppStore],
  args: {
    segments: exampleLibraryVideoText.segments,
    languages: { target: "de", translation: "en" },
    lock: null,
    selectedWord: null,
    isOnlyUndefinedShown: false,
    onSelectWord: fn(),
    onShowOnlyUndefined: fn(),
    onSaveWords: fn(async () => true),
    onApplyEverywhere: fn(async () => true),
  },
} satisfies Meta<typeof SegmentWordsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cues: Story = {};

export const Paragraphs: Story = {
  args: { segments: exampleLibraryDocumentText.segments },
};

export const WordSelected: Story = {
  args: { selectedWord: { segmentIndex: 0, start: 4 } },
};

export const OnlyLinesWithUndefinedWords: Story = {
  args: { isOnlyUndefinedShown: true },
};

export const EveryWordDefined: Story = {
  args: {
    segments: exampleLibraryDocumentText.segments,
    isOnlyUndefinedShown: true,
  },
};

export const Preparing: Story = { args: { lock: "processing" } };

export const Published: Story = { args: { lock: "published" } };

export const NoText: Story = { args: { segments: [] } };
