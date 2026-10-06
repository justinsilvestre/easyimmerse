import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AddMediaFromUrlDialog } from "./AddMediaFromUrlDialog.tsx";

const meta = {
  title: "Projects/AddMediaFromUrlDialog",
  component: AddMediaFromUrlDialog,
  parameters: { layout: "fullscreen" },
  args: {
    sources: [{ name: "youtube-media-source" }],
    isAdding: false,
    error: null,
    onAdd: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AddMediaFromUrlDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneSource: Story = {};

export const SeveralSources: Story = {
  args: {
    sources: [{ name: "youtube-media-source" }, { name: "podcast-feed" }],
  },
};

export const Adding: Story = {
  args: { isAdding: true },
};

export const Failed: Story = {
  args: {
    error: "The plugin reported an error: the video is private",
  },
};
