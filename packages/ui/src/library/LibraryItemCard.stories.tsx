import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLibraryItem } from "./exampleLibrary.ts";
import { LibraryItemCard } from "./LibraryItemCard.tsx";

const meta = {
  title: "Library/LibraryItemCard",
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
    coverUrl:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='%2359a14f'/><circle cx='12' cy='3' r='1.5' fill='%23f2d16b'/></svg>",
  },
};

export const Text: Story = {
  args: {
    item: exampleLibraryItem({
      kind: "document",
      title: "桃太郎",
      language: "ja",
      duration_ms: null,
      difficulty: "advanced",
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
