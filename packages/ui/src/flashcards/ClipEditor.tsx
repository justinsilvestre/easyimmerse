import type { AudioClip } from "@easyimmerse/types";
import { Camera } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import {
  clamp,
  moveClipEnd,
  moveClipStart,
  peakSpan,
  timeAfterKey,
  viewAroundClip,
  viewIncluding,
  viewIncludingAll,
} from "./clipView.ts";
import { formatClipTime } from "./formatClipTime.ts";
import { Peaks, peaksBetween } from "./Peaks.tsx";
import {
  type DraggableTime,
  type DragHandlers,
  useHandleDrag,
} from "./useHandleDrag.ts";

/**
 * Shows a flashcard's audio clip on the waveform around it. The clip's edges can be dragged, or moved with
 * the arrow keys, and so can the marker for the time the screenshot is taken at.
 * The part on view stays put while a handle moves, widens while a handle is held past its edge,
 * and settles around the clip again once the handle is let go.
 */
export function ClipEditor({
  peaks,
  durationMs,
  clip,
  screenshotMs,
  onClipChange,
  onScreenshotMsChange,
}: {
  peaks: readonly number[];
  durationMs: number;
  clip: AudioClip;
  screenshotMs: number | null;
  onClipChange: (clip: AudioClip) => void;
  onScreenshotMsChange: (ms: number) => void;
}) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [storedView, setStoredView] = useState(() =>
    viewAroundClip(clip, durationMs),
  );
  const view = viewIncludingAll(
    storedView,
    screenshotMs === null
      ? [clip.start_ms, clip.end_ms]
      : [clip.start_ms, clip.end_ms, screenshotMs],
    durationMs,
  );
  const latestClip = useRef(clip);
  latestClip.current = clip;
  const dragHandlers = useHandleDrag({
    waveformRef,
    view,
    durationMs,
    onViewChange: setStoredView,
    onDragEnd: () =>
      setStoredView(viewAroundClip(latestClip.current, durationMs)),
  });
  const percentOf = (ms: number) =>
    ((ms - view.startMs) / (view.endMs - view.startMs)) * 100;
  const between = (startMs: number, endMs: number) => ({
    left: `${percentOf(startMs)}%`,
    right: `${100 - percentOf(endMs)}%`,
  });
  const peaksOnView = peakSpan(peaks.length, durationMs, view);
  const handleFor = (time: DraggableTime) => ({
    valueMs: time.valueMs,
    left: `${percentOf(time.valueMs)}%`,
    dragHandlers: dragHandlers(time),
    onKeyDown: (event: KeyboardEvent) => {
      const next = timeAfterKey(event.key, event.shiftKey, time.valueMs);
      if (next === null) return;
      event.preventDefault();
      const ms = time.constrain(next);
      setStoredView(viewIncluding(view, ms, durationMs));
      time.apply(ms);
    },
  });
  return (
    <div className="flex flex-col gap-1 text-xs text-fg-muted tabular-nums">
      <div ref={waveformRef} className="relative h-16">
        <div className="absolute inset-0 overflow-hidden rounded-md bg-surface-muted">
          <div
            className="absolute inset-y-0"
            style={between(peaksOnView.startMs, peaksOnView.endMs)}
          >
            <Peaks
              peaks={peaksBetween(peaks, durationMs, view.startMs, view.endMs)}
            />
          </div>
          <span
            aria-hidden
            className="absolute inset-y-0 bg-accent/20"
            style={between(clip.start_ms, clip.end_ms)}
          />
        </div>
        <Handle
          label="Clip start"
          max={durationMs}
          {...handleFor({
            valueMs: clip.start_ms,
            constrain: (ms) => moveClipStart(clip, ms).start_ms,
            apply: (ms) => onClipChange(moveClipStart(clip, ms)),
          })}
        />
        <Handle
          label="Clip end"
          max={durationMs}
          {...handleFor({
            valueMs: clip.end_ms,
            constrain: (ms) => moveClipEnd(clip, ms, durationMs).end_ms,
            apply: (ms) => onClipChange(moveClipEnd(clip, ms, durationMs)),
          })}
        />
        {screenshotMs !== null && (
          <Handle
            label="Screenshot time"
            max={durationMs}
            icon={<Camera className="size-3.5" aria-hidden />}
            {...handleFor({
              valueMs: screenshotMs,
              constrain: (ms) => clamp(ms, 0, durationMs),
              apply: onScreenshotMsChange,
            })}
          />
        )}
      </div>
      <div className="flex justify-between">
        <span>{formatClipTime(clip.start_ms)}</span>
        <span>{formatClipTime(clip.end_ms)}</span>
      </div>
    </div>
  );
}

/** A draggable line on the waveform. With an icon it is a marker at the top; without, it is a clip edge. */
function Handle({
  label,
  valueMs,
  max,
  left,
  dragHandlers,
  onKeyDown,
  icon,
}: {
  label: string;
  valueMs: number;
  max: number;
  left: string;
  dragHandlers: DragHandlers;
  onKeyDown: (event: KeyboardEvent) => void;
  icon?: ReactNode;
}) {
  return (
    <span
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(valueMs)}
      aria-valuetext={formatClipTime(valueMs)}
      className={
        icon
          ? "absolute top-0.5 flex -translate-x-1/2 cursor-ew-resize touch-none select-none flex-col items-center text-accent focus-visible:outline-2 focus-visible:outline-accent"
          : "absolute inset-y-0 w-3 -translate-x-1/2 cursor-ew-resize touch-none select-none before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
      }
      style={{ left }}
      {...dragHandlers}
      onKeyDown={onKeyDown}
    >
      {icon}
      {icon && <span className="h-3 w-px bg-accent" />}
    </span>
  );
}
