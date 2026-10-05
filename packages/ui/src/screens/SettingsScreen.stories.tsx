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
      cache: {
        kind: "available",
        status: {
          usage_bytes: 1_230_000_000,
          limit_bytes: 5_000_000_000,
          budget_bytes: 5_000_000_000,
          free_bytes: 40_000_000_000,
          space_low: false,
        },
      },
      onClear: fn(),
      clearStatus: "",
    },
    licenseNotices: {
      status: "loaded",
      groups: [
        {
          title: "FFmpeg",
          notices: [
            {
              title: "ffmpeg (LGPL build) — notice",
              text: "Version and origin.",
            },
          ],
        },
      ],
    },
  },
};

export const LowDiskSpace: Story = {
  args: {
    conversionCache: {
      cache: {
        kind: "available",
        status: {
          usage_bytes: 1_900_000_000,
          limit_bytes: 2_000_000_000,
          budget_bytes: 5_000_000_000,
          free_bytes: 2_200_000_000,
          space_low: true,
        },
      },
      onClear: fn(),
      clearStatus: "Cleared 300 MB.",
    },
  },
};
