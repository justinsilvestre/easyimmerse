import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { PlayerFailure } from "./PlayerFailure.tsx";
import { describeUnsupportedReason } from "./playbackFailure.ts";

const desktop = {
  serverUrl: "http://127.0.0.1:5000",
  token: "t",
  bundledIn: "desktop",
} as const;

const meta = {
  title: "Components/Player/PlayerFailure",
  component: PlayerFailure,
  decorators: [
    (Story) => (
      <div className="bg-black p-6">
        <Story />
      </div>
    ),
    withAppStore,
  ],
  args: { cause: describeUnsupportedReason("video_codec_unsupported") },
} satisfies Meta<typeof PlayerFailure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** On the desktop app, a video that needs an encoder offers the media conversion settings, where another ffmpeg build is chosen. */
export const NoVideoEncoder: Story = {
  args: {
    cause: describeUnsupportedReason("no_video_encoder"),
    needsVideoEncoder: true,
  },
  parameters: { appStore: { server: desktop } },
};
