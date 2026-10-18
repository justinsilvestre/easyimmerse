import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { RemoveDictionaryDialog } from "./RemoveDictionaryDialog.tsx";

const meta = {
  title: "Dictionaries/RemoveDictionaryDialog",
  component: RemoveDictionaryDialog,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    title: "German-English Wiktionary",
    onRemove: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof RemoveDictionaryDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Asking: Story = {};
