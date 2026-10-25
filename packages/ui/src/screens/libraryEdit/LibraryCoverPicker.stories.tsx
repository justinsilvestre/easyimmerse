import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleCoverUrl,
  exampleLibraryItem,
  exampleVideoUrl,
} from "../../testSupport/exampleLibrary.ts";
import { LibraryCoverPicker } from "./LibraryCoverPicker.tsx";

const book = exampleLibraryItem({
  kind: "document",
  title: "Die Verwandlung",
  file_name: "die-verwandlung.epub",
  duration_ms: null,
});

const meta = {
  title: "Screens/Library Edit/LibraryCoverPicker",
  component: LibraryCoverPicker,
  args: {
    item: exampleLibraryItem({ has_cover: true }),
    coverUrl: exampleCoverUrl,
    previewUrl: exampleVideoUrl,
    isChanging: false,
    onUpload: fn(),
    onChooseFrame: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof LibraryCoverPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VideoWithItsFirstLine: Story = {};

export const VideoNotPublishedYet: Story = {
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" }, has_cover: false }),
    coverUrl: null,
  },
};

export const VideoWithAChosenFrame: Story = {
  args: {
    item: exampleLibraryItem({
      cover: { kind: "frame", at_ms: 2_000 },
      has_cover: true,
    }),
  },
};

export const UploadedPicture: Story = {
  args: {
    item: exampleLibraryItem({ cover: { kind: "uploaded" }, has_cover: true }),
  },
};

export const BookWithItsOwnCover: Story = {
  args: { item: { ...book, has_cover: true }, previewUrl: null },
};

export const BookWithAnUploadedPicture: Story = {
  args: {
    item: { ...book, cover: { kind: "uploaded" }, has_cover: true },
    previewUrl: null,
  },
};

export const TextWithoutACover: Story = {
  args: {
    item: { ...book, file_name: "hund.txt", has_cover: false },
    coverUrl: null,
    previewUrl: null,
  },
};

export const AudioWithAnUploadedPicture: Story = {
  args: {
    item: exampleLibraryItem({
      kind: "audio",
      cover: { kind: "uploaded" },
      has_cover: true,
    }),
    previewUrl: null,
  },
};

export const Changing: Story = { args: { isChanging: true } };

export const WhileBeingPrepared: Story = {
  args: { item: exampleLibraryItem({ status: { kind: "processing" } }) },
};
