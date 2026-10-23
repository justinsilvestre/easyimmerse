import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import {
  exampleLibraryDocumentText,
  exampleLibraryItem,
  exampleLibraryVideoText,
} from "./exampleLibrary.ts";
import { LibraryEditView } from "./LibraryEditView.tsx";

const idle = {
  isSaving: false,
  isUploading: false,
  isPublishing: false,
  failure: null,
};

const meta = {
  title: "Library/LibraryEditView",
  component: LibraryEditView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" } }),
    text: exampleLibraryVideoText,
    previewUrl: null,
    activity: idle,
    onSave: fn(),
    onReplaceFile: fn(),
    onReplaceSubtitles: fn(),
    onSaveWords: fn(),
    onProposeWords: fn(),
    onPublish: fn(),
    onUnpublish: fn(),
    onDelete: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LibraryEditView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};

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

export const ChangeRefused: Story = {
  args: {
    item: exampleLibraryItem(),
    activity: {
      ...idle,
      failure: "Unpublish the item to change its file, subtitles, or words.",
    },
  },
};

export const LoadingText: Story = { args: { text: null } };
