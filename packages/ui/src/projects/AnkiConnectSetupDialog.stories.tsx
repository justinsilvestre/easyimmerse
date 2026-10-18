import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { AnkiConnectSetupDialog } from "./AnkiConnectSetupDialog.tsx";

const meta = {
  title: "Projects/AnkiConnectSetupDialog",
  component: AnkiConnectSetupDialog,
  parameters: { layout: "fullscreen" },
  decorators: [withAppStore],
  args: {
    onConnect: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof AnkiConnectSetupDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Instructions: Story = {};
