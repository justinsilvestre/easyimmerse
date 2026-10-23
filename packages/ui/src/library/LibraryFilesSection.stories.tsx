import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLibraryItem } from "./exampleLibrary.ts";
import { LibraryFilesSection } from "./LibraryFilesSection.tsx";

const draft = exampleLibraryItem({ status: { kind: "draft" } });

const meta = {
  title: "Library/LibraryFilesSection",
  component: LibraryFilesSection,
  args: {
    item: draft,
    isUploading: false,
    onReplaceFile: fn(),
    onReplaceSubtitles: fn(),
  },
} satisfies Meta<typeof LibraryFilesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};

export const WithoutAFile: Story = {
  args: {
    item: exampleLibraryItem({
      status: { kind: "draft" },
      file_name: null,
      segment_count: 0,
    }),
  },
};

export const Text: Story = {
  args: {
    item: exampleLibraryItem({
      status: { kind: "draft" },
      kind: "document",
      file_name: "story.txt",
    }),
  },
};

export const Uploading: Story = { args: { isUploading: true } };

export const Published: Story = { args: { item: exampleLibraryItem() } };
