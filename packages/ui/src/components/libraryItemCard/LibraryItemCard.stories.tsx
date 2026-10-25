import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleCoverUrl,
  exampleLibraryItem,
} from "../../testSupport/exampleLibrary.ts";
import { LibraryItemCard } from "./LibraryItemCard.tsx";

const meta = {
  title: "Components/Library Item Card/LibraryItemCard",
  component: LibraryItemCard,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  args: {
    item: exampleLibraryItem(),
    coverUrl: null,
    onOpen: fn(),
  },
} satisfies Meta<typeof LibraryItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Video: Story = {};

export const WithCover: Story = {
  args: {
    coverUrl: exampleCoverUrl,
  },
};

export const Text: Story = {
  args: {
    item: exampleLibraryItem({
      kind: "document",
      title: "Rotkäppchen",
      duration_ms: null,
      difficulty: "C1",
    }),
  },
};

export const WithoutDifficultyOrTags: Story = {
  args: { item: exampleLibraryItem({ difficulty: null, tags: [] }) },
};

export const Draft: Story = {
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" }, duration_ms: null }),
    showsStatus: true,
  },
};

export const Preparing: Story = {
  args: {
    item: exampleLibraryItem({ status: { kind: "processing" } }),
    showsStatus: true,
  },
};

export const Failed: Story = {
  args: {
    item: exampleLibraryItem({
      status: { kind: "failed", message: "The video file could not be read." },
    }),
    showsStatus: true,
  },
};
