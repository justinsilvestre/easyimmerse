import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClipEditor } from "../../flashcards/ClipEditor.tsx";
import { peaksFromWindows } from "../../flashcards/peaksFromWindows.ts";
import { generateExamplePeaks } from "../../media/examplePeaks.ts";
import {
  exampleWaveformWindows,
  windowStartsUpTo,
} from "./exampleWaveformWindows.ts";
import { WaveformBars } from "./WaveformBars.tsx";
import { WaveformStrip } from "./WaveformStrip.tsx";

const meta = {
  title: "Components/WaveformBars",
  component: WaveformBars,
  decorators: [
    (Story) => (
      <div className="h-16 w-[32rem] max-w-full rounded-md bg-surface-muted">
        <Story />
      </div>
    ),
  ],
  args: { peaks: generateExamplePeaks(80) },
} satisfies Meta<typeof WaveformBars>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Few enough peaks that each gets a bar of its own. */
export const Loaded: Story = {};

/** Peaks so close together that each bar shows the loudest of several. */
export const ManyPeaks: Story = {
  args: { peaks: generateExamplePeaks(3000) },
};

/** The second half has not loaded yet, so it shows a faint line. */
export const PartlyLoaded: Story = {
  args: {
    peaks: generateExamplePeaks(80).map((peak, index) =>
      index < 40 ? peak : null,
    ),
  },
};

const durationMs = 10 * 60_000;
const windows = exampleWaveformWindows(windowStartsUpTo(durationMs));
const clip = { start_ms: 61_000, end_ms: 64_000 };

/** The same audio in the media screen's strip and in the flashcard form's clip editor, drawn by the same bars. */
export const InBothPlaces: Story = {
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex flex-col gap-4 text-sm text-fg-muted">
      <figure className="flex flex-col gap-1">
        <figcaption>Media screen</figcaption>
        <WaveformStrip
          durationMs={durationMs}
          currentTimeMs={62_500}
          windows={windows}
          cues={[]}
          flashcardSegments={[]}
          visibleSpanMs={12_000}
          onSeek={fn()}
          onOpenFlashcardSegment={fn()}
          onClipEndpointMoved={fn()}
          onScreenshotMarkerMoved={fn()}
          onVisibleSpanChange={fn()}
        />
      </figure>
      <figure className="flex flex-col gap-1">
        <figcaption>Flashcard form</figcaption>
        <ClipEditor
          peaks={peaksFromWindows(windows, durationMs)}
          durationMs={durationMs}
          clip={clip}
          screenshotMs={62_500}
          onClipChange={fn()}
          onScreenshotMsChange={fn()}
        />
      </figure>
    </div>
  ),
};
