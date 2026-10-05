import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { UnsupportedFormatDialog } from "./UnsupportedFormatDialog.tsx";

const meta = {
  title: "Media/UnsupportedFormatDialog",
  component: UnsupportedFormatDialog,
  parameters: { layout: "fullscreen" },
  args: {
    fileName: "Dark S01E01.mkv",
    onLearnAboutDesktopApp: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof UnsupportedFormatDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheBrowser: Story = {};
