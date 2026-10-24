import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ReaderAudioBar } from "./ReaderAudioBar.tsx";

const meta = {
  title: "Screens/Reader/ReaderAudioBar",
  component: ReaderAudioBar,
  decorators: [
    (Story) => (
      <div className="max-w-xl rounded-xl border border-line bg-surface px-4 py-2">
        <Story />
      </div>
    ),
  ],
  args: {
    isPlaying: false,
    currentMs: 83_000,
    durationMs: 1_254_000,
    failure: null,
    onTogglePlay: fn(),
    onSeek: fn(),
  },
} satisfies Meta<typeof ReaderAudioBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paused: Story = {};

export const Playing: Story = { args: { isPlaying: true } };

export const Loading: Story = { args: { currentMs: 0, durationMs: 0 } };

export const Failed: Story = {
  args: {
    failure:
      "This file is no longer open in the browser. Add it again to play it.",
  },
};
