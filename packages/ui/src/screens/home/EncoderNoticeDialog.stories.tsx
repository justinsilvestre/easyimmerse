import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { EncoderNoticeDialog } from "./EncoderNoticeDialog.tsx";

const meta = {
  title: "Screens/Home/EncoderNoticeDialog",
  component: EncoderNoticeDialog,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: { onOpenSettings: fn(), onDismiss: fn() },
} satisfies Meta<typeof EncoderNoticeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
