import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";

const meta = {
  title: "Screens/SettingsScreen",
  component: SettingsScreen,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: { onBack: fn(), onOpenAccount: fn(), onOpenDictionaries: fn() },
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
          chosen_budget_bytes: null,
        },
      },
      onClear: fn(),
      onBudgetChange: fn(),
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
          chosen_budget_bytes: null,
        },
      },
      onClear: fn(),
      onBudgetChange: fn(),
      clearStatus: "Cleared 300 MB.",
    },
  },
};

/** The desktop app adds its server's settings after the Account button, and its ffmpeg build to the Media conversion section. */
export const OnDesktop: Story = {
  parameters: {
    appStore: {
      server: {
        serverUrl: "http://127.0.0.1:5000",
        token: "t",
        bundledIn: "desktop",
      },
    },
  },
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived({
        state: { kind: "running" },
        urls: ["http://192.168.1.5:8787"],
        lan_reachable: true,
        serves_web_app: true,
        pairing_url: "http://192.168.1.5:8787",
      }),
      actions.desktopServerSettingsLoaded({
        bind: "0.0.0.0:8787",
        auth: "launch_token",
        open_signup: false,
        api_only: false,
        autostart: true,
        ffmpeg_dir: null,
        expected_hosts: [],
      }),
      actions.desktopServerLogsReceived([]),
    ),
  ],
  args: {
    ffmpegBuild: {
      capabilities: {
        kind: "loaded",
        capabilities: {
          ffmpeg: {
            path: "/Applications/easyImmerse.app/Contents/MacOS/easyimmerse-ffmpeg",
            version: "8.1.2",
            is_custom: false,
          },
          encoder_discovery_finished: true,
          video_encoder: { name: "h264_videotoolbox", software: false },
        },
      },
      choice: { canChoose: true, isSaving: false, failure: null },
      onChoose: fn(),
      onUseBundled: fn(),
    },
  },
};
