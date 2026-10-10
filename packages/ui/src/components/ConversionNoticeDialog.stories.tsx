import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConversionNoticeDialog } from "./ConversionNoticeDialog.tsx";

const meta = {
  title: "Components/ConversionNoticeDialog",
  component: ConversionNoticeDialog,
  parameters: { layout: "fullscreen" },
  args: {
    dismissForGood: true,
    onDismissForGoodToggle: fn(),
    onPlay: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConversionNoticeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
