import { Camera } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Peaks, peaksBetween } from "../media/Peaks.tsx";
import {
  clamp,
  moveClipEnd,
  moveClipStart,
  timeAfterKey,
  viewAroundClip,
  viewIncluding,
} from "./clipView.ts";
import type { AudioClip } from "./flashcardFields.ts";
import { formatClipTime } from "./formatClipTime.ts";

/**
 * Shows a flashcard's audio clip on the waveform around it. The clip's edges can be dragged, or moved with
 * the arrow keys, and so can the marker for the time the screenshot is taken at.
 * The part on view stays put while a handle moves, and widens only when a handle is pushed past its edge.
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
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => viewAroundClip(clip, durationMs));
  const span = view.endMs - view.startMs;
  const moveTo = (ms: number, apply: (ms: number) => void) => {
    setView(viewIncluding(view, ms, durationMs));
    apply(ms);
  };
  const toPercent = (ms: number) => `${((ms - view.startMs) / span) * 100}%`;
  const toMs = (clientX: number) => {
    const { left, width } = ref.current?.getBoundingClientRect() ?? {
      left: 0,
      width: 1,
    };
    return clamp(
      view.startMs + ((clientX - left) / width) * span,
      0,
      durationMs,
    );
  };
  return (
    <div className="flex flex-col gap-1 text-xs text-fg-muted tabular-nums">
      <div
        ref={ref}
        className="relative h-16 overflow-hidden rounded-md bg-surface-muted"
      >
        <Peaks
          peaks={peaksBetween(peaks, durationMs, view.startMs, view.endMs)}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 bg-accent/20"
          style={{
            left: toPercent(clip.startMs),
            right: `${100 - Number.parseFloat(toPercent(clip.endMs))}%`,
          }}
        />
        <Handle
          label="Clip start"
          valueMs={clip.startMs}
          max={durationMs}
          left={toPercent(clip.startMs)}
          toMs={toMs}
          onMove={(ms) =>
            moveTo(ms, () => onClipChange(moveClipStart(clip, ms)))
          }
        />
        <Handle
          label="Clip end"
          valueMs={clip.endMs}
          max={durationMs}
          left={toPercent(clip.endMs)}
          toMs={toMs}
          onMove={(ms) =>
            moveTo(ms, () => onClipChange(moveClipEnd(clip, ms, durationMs)))
          }
        />
        {screenshotMs !== null && (
          <Handle
            label="Screenshot time"
            valueMs={screenshotMs}
            max={durationMs}
            left={toPercent(screenshotMs)}
            toMs={toMs}
            onMove={(ms) =>
              moveTo(ms, () => onScreenshotMsChange(clamp(ms, 0, durationMs)))
            }
            icon={<Camera className="size-3.5" aria-hidden />}
          />
        )}
      </div>
      <div className="flex justify-between">
        <span>{formatClipTime(clip.startMs)}</span>
        <span>{formatClipTime(clip.endMs)}</span>
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
  toMs,
  onMove,
  icon,
}: {
  label: string;
  valueMs: number;
  max: number;
  left: string;
  toMs: (clientX: number) => number;
  onMove: (ms: number) => void;
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
          ? "absolute top-0.5 flex -translate-x-1/2 cursor-ew-resize touch-none flex-col items-center text-accent focus-visible:outline-2 focus-visible:outline-accent"
          : "absolute inset-y-0 w-3 -translate-x-1/2 cursor-ew-resize touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:bg-accent focus-visible:outline-2 focus-visible:outline-accent"
      }
      style={{ left }}
      onPointerDown={(event) =>
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      onPointerMove={(event) => {
        if (event.buttons & 1) onMove(toMs(event.clientX));
      }}
      onKeyDown={(event) => {
        const next = timeAfterKey(event.key, event.shiftKey, valueMs);
        if (next === null) return;
        event.preventDefault();
        onMove(next);
      }}
    >
      {icon}
      {icon && <span className="h-3 w-px bg-accent" />}
    </span>
  );
}
