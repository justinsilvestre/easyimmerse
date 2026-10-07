import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleMediaDescription } from "../projects/exampleMediaSourceJob.ts";
import { FetchSourceSubtitlesDialog } from "./FetchSourceSubtitlesDialog.tsx";

const meta = {
  title: "Subtitles/FetchSourceSubtitlesDialog",
  component: FetchSourceSubtitlesDialog,
  parameters: { layout: "fullscreen" },
  args: {
    subtitles: exampleMediaDescription.subtitles,
    error: null,
    existingNames: ["Japanese"],
    languages: { target: "ja", translation: "en" },
    isFetching: false,
    onFetch: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof FetchSourceSubtitlesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Offered: Story = {};

export const Asking: Story = {
  args: { subtitles: null },
};

export const Fetching: Story = {
  args: { isFetching: true },
};

export const Failed: Story = {
  args: {
    subtitles: null,
    error: 'no media-source plugin "video-site-media-source"',
  },
};
