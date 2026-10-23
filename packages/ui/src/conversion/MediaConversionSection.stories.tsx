import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import type { FfmpegBuildControls } from "./FfmpegBuildBlock.tsx";
import { MediaConversionSection } from "./MediaConversionSection.tsx";

const bundled = {
  path: "/Applications/easyImmerse.app/Contents/MacOS/easyimmerse-ffmpeg",
  version: "8.1.2",
  is_custom: false,
};

const idle = { canChoose: true, isSaving: false, failure: null };

/** The ffmpeg block's controls with the given capabilities. */
const controls = (
  capabilities: FfmpegBuildControls["capabilities"],
  choice: FfmpegBuildControls["choice"] = idle,
): FfmpegBuildControls => ({
  capabilities,
  choice,
  onChoose: fn(),
  onUseBundled: fn(),
});

const meta = {
  title: "Conversion/MediaConversionSection",
  component: MediaConversionSection,
  decorators: [
    (Story) => (
      <div className="max-w-2xl bg-canvas p-4 text-fg">
        <Story />
      </div>
    ),
    withAppStore,
  ],
  args: { ffmpegBuild: null },
} satisfies Meta<typeof MediaConversionSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The web and mobile apps choose no ffmpeg build. */
export const NotOnDesktop: Story = {};

export const BundledWithHardwareEncoder: Story = {
  args: {
    ffmpegBuild: controls({
      kind: "loaded",
      capabilities: {
        ffmpeg: bundled,
        encoder_discovery_finished: true,
        video_encoder: { name: "h264_videotoolbox", software: false },
      },
    }),
  },
};

export const CustomBuildWithSoftwareEncoder: Story = {
  args: {
    ffmpegBuild: controls({
      kind: "loaded",
      capabilities: {
        ffmpeg: {
          path: "/opt/homebrew/bin/ffmpeg",
          version: "7.1.1",
          is_custom: true,
        },
        encoder_discovery_finished: true,
        video_encoder: { name: "libx264", software: true },
      },
    }),
  },
};

export const DiscoveryPending: Story = {
  args: {
    ffmpegBuild: controls({
      kind: "loaded",
      capabilities: {
        ffmpeg: bundled,
        encoder_discovery_finished: false,
        video_encoder: null,
      },
    }),
  },
};

/** No encoder works with the bundled build, so the section explains how to install one that has a software encoder. */
export const NoEncoderWithGuidance: Story = {
  args: {
    ffmpegBuild: controls({
      kind: "loaded",
      capabilities: {
        ffmpeg: bundled,
        encoder_discovery_finished: true,
        video_encoder: null,
      },
    }),
  },
};

export const NoFfmpegFound: Story = {
  args: {
    ffmpegBuild: controls({
      kind: "loaded",
      capabilities: {
        ffmpeg: null,
        encoder_discovery_finished: true,
        video_encoder: null,
      },
    }),
  },
};

/** The chosen build is being saved, which restarts the server. */
export const SavingChosenBuild: Story = {
  args: {
    ffmpegBuild: controls(
      {
        kind: "loaded",
        capabilities: {
          ffmpeg: bundled,
          encoder_discovery_finished: true,
          video_encoder: null,
        },
      },
      { canChoose: false, isSaving: true, failure: null },
    ),
  },
};

export const ChosenFileIsNotFfmpeg: Story = {
  args: {
    ffmpegBuild: controls(
      {
        kind: "loaded",
        capabilities: {
          ffmpeg: bundled,
          encoder_discovery_finished: true,
          video_encoder: null,
        },
      },
      {
        ...idle,
        failure:
          "Choose the program named ffmpeg (ffmpeg.exe on Windows) in the build's folder.",
      },
    ),
  },
};

export const CheckFailed: Story = {
  args: {
    ffmpegBuild: controls({
      kind: "failed",
      message: "The server did not answer.",
    }),
  },
};
