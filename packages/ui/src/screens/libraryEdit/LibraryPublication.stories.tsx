import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { exampleLibraryItem } from "../../testSupport/exampleLibrary.ts";
import { LibraryPublication } from "./LibraryPublication.tsx";

const meta = {
  title: "Screens/Library Edit/LibraryPublication",
  component: LibraryPublication,
  decorators: [withAppStore],
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" } }),
    isBusy: false,
    onProposeWords: fn(),
    onPublish: fn(),
    onUnpublish: fn(),
    isConfirmingDelete: false,
    onAskDelete: fn(),
    onCancelDelete: fn(),
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

export const PreparingAText: Story = {
  args: {
    item: exampleLibraryItem({
      kind: "document",
      status: { kind: "processing" },
    }),
  },
};

export const Failed: Story = {
  args: {
    item: exampleLibraryItem({
      status: { kind: "failed", message: "ffmpeg exited with status 1 while rendering the clip of cue 3" },
    }),
  },
};

export const Published: Story = { args: { item: exampleLibraryItem() } };

export const Busy: Story = { args: { isBusy: true } };

export const ConfirmingDelete: Story = { args: { isConfirmingDelete: true } };
