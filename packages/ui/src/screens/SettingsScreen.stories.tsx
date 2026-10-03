import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";

const meta = {
  title: "Screens/SettingsScreen",
  component: SettingsScreen,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: { onBack: fn() },
} satisfies Meta<typeof SettingsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutConversion: Story = {};

export const WithConvertedVideos: Story = {
  args: {
    conversionCache: {
      status: {
        usageBytes: 1_230_000_000,
        limitBytes: 5_000_000_000,
        budgetBytes: 5_000_000_000,
        freeBytes: 40_000_000_000,
        spaceLow: false,
      },
      onClear: fn(),
      clearStatus: "",
    },
    licenseNotices: [
      { title: "ffmpeg (LGPL build) — notice", text: "Version and origin." },
    ],
  },
};

export const LowDiskSpace: Story = {
  args: {
    conversionCache: {
      status: {
        usageBytes: 1_900_000_000,
        limitBytes: 2_000_000_000,
        budgetBytes: 5_000_000_000,
        freeBytes: 2_200_000_000,
        spaceLow: true,
      },
      onClear: fn(),
      clearStatus: "Cleared 300 MB.",
    },
  },
};
