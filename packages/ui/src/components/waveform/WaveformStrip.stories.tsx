import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { fixtureTrack } from "../../testSupport/fixtureResponses.ts";
import type { WaveformStripProps } from "./WaveformStrip.tsx";
import { WaveformStrip } from "./WaveformStrip.tsx";
import { clampVisibleSpan } from "./waveformGeometry.ts";
import {
  waveformPeaksPerSecond,
  waveformWindowMs,
} from "./waveformWindowPolicy.ts";

const durationMs = 10 * 60_000;

/** A speech-like signal: bursts of varying loudness with pauses between them. */
function syntheticWindow(startMs: number): Uint8Array {
  const peaks = new Uint8Array(
    (waveformWindowMs / 1000) * waveformPeaksPerSecond,
  );
  for (let i = 0; i < peaks.length; i += 1) {
    const t = (startMs / 1000) * waveformPeaksPerSecond + i;
    const burst = Math.max(0, Math.sin(t / 90)) ** 2;
    const texture = 0.6 + 0.4 * Math.abs(Math.sin(t / 3.7) * Math.cos(t / 11));
    peaks[i] = Math.round(255 * burst * texture);
  }
  return peaks;
}

function windowsFor(
  starts: readonly number[],
): ReadonlyMap<number, Uint8Array> {
  return new Map(starts.map((start) => [start, syntheticWindow(start)]));
}

const everyWindow = Array.from(
  { length: durationMs / waveformWindowMs },
  (_, index) => index * waveformWindowMs,
);

/** Keeps the zoom and position in local state so the strip can be used in the story. */
function InteractiveStrip(props: WaveformStripProps) {
  const [visibleSpanMs, setVisibleSpanMs] = useState(props.visibleSpanMs);
  const [currentTimeMs, setCurrentTimeMs] = useState(props.currentTimeMs);
  return (
    <WaveformStrip
      {...props}
      visibleSpanMs={visibleSpanMs}
      currentTimeMs={currentTimeMs}
      onVisibleSpanChange={(spanMs) => {
        props.onVisibleSpanChange(spanMs);
        setVisibleSpanMs(clampVisibleSpan(spanMs, props.durationMs));
      }}
      onSeek={(timeMs) => {
        props.onSeek(timeMs);
        setCurrentTimeMs(timeMs);
      }}
    />
  );
}

const meta = {
  title: "Components/WaveformStrip",
  component: WaveformStrip,
  render: (args) => <InteractiveStrip {...args} />,
  decorators: [
    (Story) => (
      <div className="w-[48rem] max-w-full rounded bg-gray-950 p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    durationMs,
    currentTimeMs: 62_000,
    windows: windowsFor(everyWindow),
    cues: [],
    flashcardSegments: [],
    visibleSpanMs: 60_000,
    onSeek: fn(),
    onOpenFlashcardSegment: fn(),
    onClipEndpointMoved: fn(),
    onScreenshotMarkerMoved: fn(),
    onVisibleSpanChange: fn(),
  },
} satisfies Meta<typeof WaveformStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const StillLoading: Story = {
  args: { windows: windowsFor([30_000, 60_000]) },
};

export const NoAudio: Story = {
  args: { windows: new Map() },
};

export const WithCuesAndFlashcards: Story = {
  args: {
    currentTimeMs: 4_000,
    visibleSpanMs: 12_000,
    cues: fixtureTrack.cues,
    flashcardSegments: [
      { id: "f1", startMs: 1_750, endMs: 3_000, screenshotMs: 2_200 },
      { id: "f2", startMs: 6_000, endMs: 9_500, screenshotMs: 8_000 },
    ],
  },
};

export const WidestZoom: Story = {
  args: { visibleSpanMs: 300_000, currentTimeMs: 150_000 },
};
