import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleLibraryDocumentText,
  exampleLibraryItem,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import { LibraryWordsSection } from "./LibraryWordsSection.tsx";

const meta = {
  title: "Screens/Library Edit/LibraryWordsSection",
  component: LibraryWordsSection,
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" } }),
    text: exampleLibraryVideoText,
    isOpening: false,
    onOpen: fn(),
  },
} satisfies Meta<typeof LibraryWordsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};

export const WithoutWords: Story = {
  args: {
    text: {
      ...exampleLibraryVideoText,
      segments: exampleLibraryVideoText.segments.map((segment) => ({
        ...segment,
        words: [],
      })),
    },
  },
};

export const Text: Story = {
  args: {
    item: exampleLibraryItem({
      status: { kind: "draft" },
      kind: "document",
      file_name: "story.txt",
    }),
    text: exampleLibraryDocumentText,
  },
};

export const Opening: Story = { args: { isOpening: true } };

export const Published: Story = { args: { item: exampleLibraryItem() } };

export const LoadingText: Story = { args: { text: null } };
