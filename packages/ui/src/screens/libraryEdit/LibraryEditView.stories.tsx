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
  isOpening: false,
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
    onSave: fn(),
    onUploadCover: fn(),
    onChooseCoverFrame: fn(),
    onResetCover: fn(),
    onReplaceFile: fn(),
    onOpenWords: fn(),
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
      failure:
        "The file of “Im Park” couldn't be replaced. It is published, so its file, subtitles and words can't change while learners use it. Unpublish it, make the change, then publish it again.",
    },
  },
};

export const ConfirmingDelete: Story = { args: { isConfirmingDelete: true } };

export const Opening: Story = {
  args: { activity: { ...idle, isOpening: true } },
};

export const LoadingText: Story = { args: { text: null } };
