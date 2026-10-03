import clsx from "clsx";
import { ZoomIn, ZoomOut } from "lucide-react";
import { stripMarkup } from "../components/ClickableText.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { formatTimestamp } from "./formatTimestamp.ts";
import { Peaks, peaksBetween } from "./Peaks.tsx";

/** A time range drawn over the waveform: a subtitle cue, or a cue that has a flashcard. */
export type WaveformSegment = {
  id: string;
  startMs: number;
  endMs: number;
  label: string;
  kind: "cue" | "flashcard";
};

export type WaveformCallbacks = {
  onSeek: (ms: number) => void;
  onSegmentClick: (segmentId: string) => void;
  onSegmentDoubleClick: (segmentId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

/**
 * Draws the audio between the two view times as peaks, with the cues over it.
 * The peaks cover the whole file; the part on view is cut out of them.
 * Clicking the background seeks; clicking a segment seeks to its start; double-clicking a flashcard segment opens the flashcard.
 */
export function Waveform({
  peaks,
  durationMs,
  viewStartMs,
  viewEndMs,
  currentMs,
  segments,
  editingSegmentId,
  canZoomIn,
  canZoomOut,
  callbacks,
}: {
  peaks: readonly number[];
  durationMs: number;
  viewStartMs: number;
  viewEndMs: number;
  currentMs: number;
  segments: readonly WaveformSegment[];
  /** The segment whose flashcard is open in the editor, which is drawn emphasized. */
  editingSegmentId: string | null;
  canZoomIn: boolean;
  canZoomOut: boolean;
  callbacks: WaveformCallbacks;
}) {
  const span = viewEndMs - viewStartMs;
  const toPercent = (ms: number) => `${((ms - viewStartMs) / span) * 100}%`;
  const toPercentWidth = (ms: number) => `${(ms / span) * 100}%`;
  const msAtClick = (event: React.MouseEvent<HTMLElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    return viewStartMs + ((event.clientX - left) / width) * span;
  };
  return (
    <div className="border-t border-line bg-surface px-3 py-2">
      <div className="relative h-24 overflow-hidden rounded-md bg-surface-muted">
        <button
          type="button"
          aria-label="Seek within the media"
          className="absolute inset-0 w-full cursor-crosshair"
          onClick={(event) => callbacks.onSeek(msAtClick(event))}
        >
          <Peaks
            peaks={peaksBetween(peaks, durationMs, viewStartMs, viewEndMs)}
          />
        </button>
        {segments.map((segment) => (
          <Segment
            key={segment.id}
            segment={segment}
            left={toPercent(segment.startMs)}
            width={toPercentWidth(segment.endMs - segment.startMs)}
            isEditing={editingSegmentId === segment.id}
            callbacks={callbacks}
          />
        ))}
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-fg"
          style={{ left: toPercent(currentMs) }}
        />
        <span className="absolute right-1 bottom-1 z-20 flex rounded-md bg-surface/80">
          <IconButton
            label="Zoom out"
            className="size-6"
            disabled={!canZoomOut}
            onClick={callbacks.onZoomOut}
          >
            <ZoomOut className="size-3.5" />
          </IconButton>
          <IconButton
            label="Zoom in"
            className="size-6"
            disabled={!canZoomIn}
            onClick={callbacks.onZoomIn}
          >
            <ZoomIn className="size-3.5" />
          </IconButton>
        </span>
      </div>
    </div>
  );
}

function Segment({
  segment,
  left,
  width,
  isEditing,
  callbacks,
}: {
  segment: WaveformSegment;
  left: string;
  width: string;
  isEditing: boolean;
  callbacks: WaveformCallbacks;
}) {
  const isFlashcard = segment.kind === "flashcard";
  return (
    <button
      type="button"
      aria-label={`${isFlashcard ? "Flashcard" : "Cue"} at ${formatTimestamp(segment.startMs)}: ${stripMarkup(segment.label)}`}
      title={stripMarkup(segment.label)}
      className={clsx(
        "absolute inset-y-0 border-x",
        isFlashcard
          ? "border-accent bg-accent/25 hover:bg-accent/35"
          : "border-line-strong bg-fg/5 hover:bg-fg/10",
        isEditing && "z-10 border-x-4 border-accent bg-accent/30",
      )}
      style={{ left, width }}
      onClick={() => callbacks.onSegmentClick(segment.id)}
      onDoubleClick={() => callbacks.onSegmentDoubleClick(segment.id)}
    />
  );
}
