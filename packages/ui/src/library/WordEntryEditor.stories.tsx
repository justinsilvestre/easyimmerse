import type { LibrarySegment } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { exampleLibraryVideoText } from "./exampleLibrary.ts";
import { WordEntryEditor } from "./WordEntryEditor.tsx";

const [first, second] = exampleLibraryVideoText.segments as LibrarySegment[];

const meta = {
  title: "Library/WordEntryEditor",
  component: WordEntryEditor,
  decorators: [withAppStore],
  args: {
    segment: first as LibrarySegment,
    wordIndex: 1,
    languages: { target: "de", translation: "en" },
    onChangeWords: fn(),
    onApplyEverywhere: fn(),
  },
} satisfies Meta<typeof WordEntryEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defined: Story = {};

export const WithoutDefinition: Story = {
  args: { segment: second as LibrarySegment, wordIndex: 3 },
};

export const LastWord: Story = { args: { wordIndex: 2 } };
