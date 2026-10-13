import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { BilingualEbookDialog } from "./BilingualEbookDialog.tsx";

const meta = {
  title: "Reader/BilingualEbookDialog",
  component: BilingualEbookDialog,
  // The dialog shows the app's notices, which it reads from the store.
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: { alignmentPlugins: [], onClose: fn() },
} satisfies Meta<typeof BilingualEbookDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoProvider: Story = {};

export const ListingPlugins: Story = {
  args: { alignmentPlugins: null },
};

export const PluginFound: Story = {
  args: {
    alignmentPlugins: [
      {
        name: "aligner",
        title: "Sentence aligner",
        version: "0.1.0",
        kind: "alignment",
        import_label: null,
      },
    ],
  },
};
