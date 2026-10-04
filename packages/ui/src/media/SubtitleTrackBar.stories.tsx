import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SubtitleTrackBar } from "./SubtitleTrackBar.tsx";

const meta = {
  title: "Media/SubtitleTrackBar",
  component: SubtitleTrackBar,
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-96 bg-canvas text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    tracks: {
      audio: [],
      subtitles: [
        { id: "s1", label: "German", language: "de", sample: "Hallo." },
        { id: "s2", label: "English", language: "en", sample: "Hello." },
      ],
      audioId: null,
      targetSubtitlesId: "s1",
      translationSubtitlesId: "s2",
    },
    onTargetChange: fn(),
    onTranslationChange: fn(),
    onAddFile: fn(),
  },
} satisfies Meta<typeof SubtitleTrackBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DualSubtitles: Story = {};

export const NoTracks: Story = {
  args: {
    tracks: {
      audio: [],
      subtitles: [],
      audioId: null,
      targetSubtitlesId: null,
      translationSubtitlesId: null,
    },
  },
};
