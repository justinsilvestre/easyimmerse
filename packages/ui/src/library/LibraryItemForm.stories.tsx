import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLibraryItem } from "./exampleLibrary.ts";
import { LibraryItemForm } from "./LibraryItemForm.tsx";

const meta = {
  title: "Library/LibraryItemForm",
  component: LibraryItemForm,
  args: {
    item: exampleLibraryItem(),
    previewUrl: null,
    isSaving: false,
    onSave: fn(),
  },
} satisfies Meta<typeof LibraryItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Video: Story = {};

export const CoverChosen: Story = {
  args: { item: exampleLibraryItem({ cover_at_ms: 12_000 }) },
};

export const Text: Story = {
  args: {
    item: exampleLibraryItem({ kind: "document", difficulty: null, tags: [] }),
  },
};

export const Saving: Story = { args: { isSaving: true } };
