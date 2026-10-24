import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import {
  exampleLibraryDocumentText,
  exampleLibraryItem,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import { LibraryEditView } from "./LibraryEditView.tsx";

const idle = {
  isSaving: false,
  isChangingCover: false,
  isUploading: false,
  isPublishing: false,
  failure: null,
};

const meta = {
  title: "Screens/Library Edit/LibraryEditView",
  component: LibraryEditView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" } }),
    text: exampleLibraryVideoText,
    coverUrl: null,
    previewUrl: null,
    activity: idle,
    isConfirmingDelete: false,
    selectedWord: null,
    isOnlyUndefinedShown: false,
    onSave: fn(),
    onUploadCover: fn(),
    onChooseCoverFrame: fn(),
    onResetCover: fn(),
    onReplaceFile: fn(),
    onReplaceSubtitles: fn(),
    onSelectWord: fn(),
    onShowOnlyUndefined: fn(),
    onSaveWords: fn(async () => true),
    onApplyEverywhere: fn(async () => true),
    onProposeWords: fn(),
    onPublish: fn(),
    onUnpublish: fn(),
    onAskDelete: fn(),
    onCancelDelete: fn(),
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

export const ConfirmingDelete: Story = { args: { isConfirmingDelete: true } };

export const WordSelected: Story = {
  args: { selectedWord: { segmentIndex: 1, start: 13 } },
};

export const LoadingText: Story = { args: { text: null } };
