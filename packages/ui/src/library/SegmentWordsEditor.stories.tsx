import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import {
  exampleLibraryDocumentText,
  exampleLibraryVideoText,
} from "./exampleLibrary.ts";
import { SegmentWordsEditor } from "./SegmentWordsEditor.tsx";

const meta = {
  title: "Library/SegmentWordsEditor",
  component: SegmentWordsEditor,
  decorators: [withAppStore],
  args: {
    segments: exampleLibraryVideoText.segments,
    languages: { target: "de", translation: "en" },
    isLocked: false,
    onSaveWords: fn(),
  },
} satisfies Meta<typeof SegmentWordsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cues: Story = {};

export const Paragraphs: Story = {
  args: { segments: exampleLibraryDocumentText.segments },
};

export const Published: Story = { args: { isLocked: true } };

export const NoText: Story = { args: { segments: [] } };
