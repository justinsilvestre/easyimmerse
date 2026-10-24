import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleCoverUrl,
  exampleLibraryItem,
} from "../../testSupport/exampleLibrary.ts";
import { LibraryItemForm } from "./LibraryItemForm.tsx";

const meta = {
  title: "Screens/Library Edit/LibraryItemForm",
  component: LibraryItemForm,
  args: {
    item: exampleLibraryItem({ has_cover: true }),
    coverUrl: exampleCoverUrl,
    previewUrl: null,
    isSaving: false,
    isChangingCover: false,
    onSave: fn(),
    onUploadCover: fn(),
    onChooseCoverFrame: fn(),
    onResetCover: fn(),
  },
} satisfies Meta<typeof LibraryItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Video: Story = {};

export const Text: Story = {
  args: {
    item: exampleLibraryItem({ kind: "document", difficulty: null, tags: [] }),
    coverUrl: null,
  },
};

export const Saving: Story = { args: { isSaving: true } };
