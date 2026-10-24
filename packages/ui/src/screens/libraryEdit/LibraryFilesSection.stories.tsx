import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { exampleLibraryItem } from "../../testSupport/exampleLibrary.ts";
import { LibraryFilesSection } from "./LibraryFilesSection.tsx";

const draft = exampleLibraryItem({ status: { kind: "draft" } });

const meta = {
  title: "Screens/Library Edit/LibraryFilesSection",
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

/** The fold that replaces the video, open. */
export const ReplacingTheFile: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByText("Replace park.mp4"));
  },
};

/** The fold that replaces the subtitles, open. */
export const ReplacingTheSubtitles: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByText("Replace the subtitles"),
    );
  },
};

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

export const Preparing: Story = {
  args: { item: exampleLibraryItem({ status: { kind: "processing" } }) },
};
