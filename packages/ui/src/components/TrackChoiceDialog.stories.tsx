import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TrackChoiceDialog } from "./TrackChoiceDialog.tsx";

const meta = {
  title: "Components/TrackChoiceDialog",
  component: TrackChoiceDialog,
  parameters: { layout: "fullscreen" },
  args: {
    videoTracks: [],
    audioTracks: [
      {
        streamIndex: 1,
        language: "ja",
        title: null,
        format: "AAC stereo",
        isDefault: true,
      },
      {
        streamIndex: 2,
        language: "en",
        title: null,
        format: "AC-3 5.1",
        isDefault: false,
      },
    ],
    onChoose: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof TrackChoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AudioOnly: Story = {};

export const VideoAndAudio: Story = {
  args: {
    videoTracks: [
      {
        streamIndex: 0,
        language: null,
        title: null,
        format: "H.264 1920×1080",
        isDefault: true,
      },
      {
        streamIndex: 4,
        language: null,
        title: "Director's cut",
        format: "HEVC 3840×2160",
        isDefault: false,
      },
    ],
  },
};

export const WithDuplicateNames: Story = {
  args: {
    audioTracks: [
      {
        streamIndex: 1,
        language: "ja",
        title: null,
        format: "AAC stereo",
        isDefault: true,
      },
      {
        streamIndex: 2,
        language: "ja",
        title: null,
        format: "FLAC stereo",
        isDefault: false,
      },
      {
        streamIndex: 3,
        language: "ja",
        title: "Commentary",
        format: "AAC stereo",
        isDefault: false,
      },
    ],
  },
};
