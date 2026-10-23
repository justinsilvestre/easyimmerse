import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLibraryItem } from "./exampleLibrary.ts";
import { LibraryPublication } from "./LibraryPublication.tsx";

const meta = {
  title: "Library/LibraryPublication",
  component: LibraryPublication,
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" } }),
    isBusy: false,
    onProposeWords: fn(),
    onPublish: fn(),
    onUnpublish: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof LibraryPublication>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};

export const DraftWithoutAFile: Story = {
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" }, file_name: null }),
  },
};

export const Preparing: Story = {
  args: { item: exampleLibraryItem({ status: { kind: "processing" } }) },
};

export const Failed: Story = {
  args: {
    item: exampleLibraryItem({
      status: { kind: "failed", message: "The video file could not be read." },
    }),
  },
};

export const Published: Story = { args: { item: exampleLibraryItem() } };

export const Busy: Story = { args: { isBusy: true } };
