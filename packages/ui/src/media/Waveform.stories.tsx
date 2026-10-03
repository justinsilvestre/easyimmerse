import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleCues, exampleFlashcardCueIndexes } from "./exampleCues.ts";
import { generateExamplePeaks } from "./examplePeaks.ts";
import { segmentsFromCues } from "./segmentsFromCues.ts";
import { Waveform } from "./Waveform.tsx";

const meta = {
  title: "Media/Waveform",
  component: Waveform,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="bg-canvas p-4 text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    peaks: generateExamplePeaks(240),
    durationMs: 24_000,
    viewStartMs: 0,
    viewEndMs: 24_000,
    currentMs: 6_200,
    segments: segmentsFromCues(exampleCues, exampleFlashcardCueIndexes),
    editingSegmentId: null,
    canZoomIn: true,
    canZoomOut: false,
    callbacks: {
      onSeek: fn(),
      onSegmentClick: fn(),
      onSegmentDoubleClick: fn(),
      onZoomIn: fn(),
      onZoomOut: fn(),
    },
  },
} satisfies Meta<typeof Waveform>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCues: Story = {};

export const EditingAFlashcard: Story = {
  args: { editingSegmentId: "3" },
};

export const ZoomedIn: Story = {
  args: {
    viewStartMs: 4_000,
    viewEndMs: 10_000,
    canZoomIn: false,
    canZoomOut: true,
  },
};

export const NoSubtitles: Story = {
  args: { segments: [] },
};
