import clsx from "clsx";
import { Camera, ZoomIn, ZoomOut } from "lucide-react";
import { stripMarkup } from "../components/ClickableText.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { formatTimestamp } from "./formatTimestamp.ts";

/** A time range drawn over the waveform: a subtitle cue, or a cue that has a flashcard. */
export type WaveformSegment = {
  id: string;
  startMs: number;
  endMs: number;
  label: string;
  kind: "cue" | "flashcard";
};

/** The segment whose endpoints and screenshot time can be dragged while its flashcard is being edited. */
export type SegmentEditing = { segmentId: string; screenshotMs: number };

export type WaveformCallbacks = {
  onSeek: (ms: number) => void;
  onSegmentClick: (segmentId: string) => void;
  onSegmentDoubleClick: (segmentId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

/**
 * Draws the audio of the visible time range as peaks, with the cues over it.
 * Clicking the background seeks; clicking a segment seeks to its start; double-clicking a flashcard segment opens the flashcard.
 */
export function Waveform({
  peaks,
  viewStartMs,
  viewEndMs,
  currentMs,
  segments,
  editing,
  canZoomIn,
  canZoomOut,
  callbacks,
}: {
  peaks: readonly number[];
  viewStartMs: number;
  viewEndMs: number;
  currentMs: number;
  segments: readonly WaveformSegment[];
  editing: SegmentEditing | null;
  canZoomIn: boolean;
  canZoomOut: boolean;
  callbacks: WaveformCallbacks;
}) {
  const span = viewEndMs - viewStartMs;
  const toPercent = (ms: number) => `${((ms - viewStartMs) / span) * 100}%`;
  const msAtClick = (event: React.MouseEvent<HTMLElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    return viewStartMs + ((event.clientX - left) / width) * span;
  };
  return (
    <div className="flex flex-col gap-1 border-t border-line bg-surface px-3 py-2">
      <div className="relative h-24 overflow-hidden rounded-md bg-surface-muted">
        <button
          type="button"
          aria-label="Seek within the media"
          className="absolute inset-0 w-full cursor-crosshair"
          onClick={(event) => callbacks.onSeek(msAtClick(event))}
        >
          <Peaks peaks={peaks} />
        </button>
        {segments.map((segment) => (
          <Segment
            key={segment.id}
            segment={segment}
            left={toPercent(segment.startMs)}
            width={toPercent(segment.endMs + viewStartMs - segment.startMs)}
            isEditing={editing?.segmentId === segment.id}
            callbacks={callbacks}
          />
        ))}
        {editing && (
          <span
            role="img"
            aria-label="Screenshot time"
            className="absolute top-1 flex -translate-x-1/2 cursor-ew-resize flex-col items-center text-accent"
            style={{ left: toPercent(editing.screenshotMs) }}
          >
            <Camera className="size-3.5" aria-hidden />
            <span className="h-3 w-px bg-accent" />
          </span>
        )}
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-fg"
          style={{ left: toPercent(currentMs) }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-fg-faint tabular-nums">
        <span>{formatTimestamp(viewStartMs)}</span>
        <span className="flex items-center gap-1">
          <IconButton
            label="Zoom out"
            disabled={!canZoomOut}
            onClick={callbacks.onZoomOut}
          >
            <ZoomOut className="size-4" />
          </IconButton>
          <IconButton
            label="Zoom in"
            disabled={!canZoomIn}
            onClick={callbacks.onZoomIn}
          >
            <ZoomIn className="size-4" />
          </IconButton>
        </span>
        <span>{formatTimestamp(viewEndMs)}</span>
      </div>
    </div>
  );
}

function Peaks({ peaks }: { peaks: readonly number[] }) {
  const barWidth = 1000 / peaks.length;
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      className="h-full w-full text-fg-faint"
    >
      {peaks.map((peak, index) => (
        <rect
          // Peaks never reorder, so the position is the identity.
          key={index.toString()}
          x={index * barWidth}
          y={50 - peak * 48}
          width={barWidth * 0.7}
          height={peak * 96}
          fill="currentColor"
        />
      ))}
    </svg>
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
    >
      {isFlashcard && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />
      )}
    </button>
  );
}
