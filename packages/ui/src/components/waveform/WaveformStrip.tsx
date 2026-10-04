import type { Cue } from "@easyimmerse/types";
import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { formatPlayerTime } from "../formatPlayerTime.ts";
import { drawWaveform } from "./drawWaveform.ts";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import { useElementWidth } from "./useElementWidth.ts";
import type { WaveformGestureHandlers } from "./useWaveformInteraction.ts";
import { useWaveformInteraction } from "./useWaveformInteraction.ts";
import { WaveformZoomControl } from "./WaveformZoomControl.tsx";
import { applyDrag } from "./waveformDrag.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { canZoom, computeViewStart, zoomedSpan } from "./waveformGeometry.ts";

export const waveformStripHeightPx = 72;

/** The media's duration and position in milliseconds, with the peaks windows held so far by their start. */
export type WaveformStripProps = WaveformGestureHandlers & {
  durationMs: number;
  currentTimeMs: number;
  windows: ReadonlyMap<number, Uint8Array>;
  cues: readonly Cue[];
  flashcardSegments: readonly FlashcardSegment[];
  /** The span of media shown, already clamped by the caller through `clampVisibleSpan`. */
  visibleSpanMs: number;
};

/**
 * Draws the audio peaks around the current time with the cues and flashcard segments over them.
 * Clicking seeks, double-clicking a segment opens it, and its handles drag; the wheel, a pinch, or the corner control zooms.
 */
export function WaveformStrip(props: WaveformStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const widthPx = useElementWidth(containerRef);
  const view: WaveformView = {
    startMs: computeViewStart(
      props.currentTimeMs,
      props.visibleSpanMs,
      props.durationMs,
    ),
    spanMs: props.visibleSpanMs,
    widthPx,
  };
  const { drag, ...pointerHandlers } = useWaveformInteraction({
    canvasRef,
    view,
    durationMs: props.durationMs,
    segments: props.flashcardSegments,
    handlers: props,
  });
  const segments = applyDrag(props.flashcardSegments, drag);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || widthPx === 0) return;
    fitCanvas(canvas, ctx, widthPx);
    drawWaveform(ctx, {
      view,
      heightPx: waveformStripHeightPx,
      currentTimeMs: props.currentTimeMs,
      windows: props.windows,
      cues: props.cues,
      segments,
    });
  });
  const zoom = (direction: "in" | "out") =>
    props.onVisibleSpanChange(
      zoomedSpan(props.visibleSpanMs, direction, props.durationMs),
    );
  return (
    <div ref={containerRef} className="relative w-full select-none">
      <canvas
        ref={canvasRef}
        role="slider"
        tabIndex={0}
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={props.durationMs / 1000}
        aria-valuenow={props.currentTimeMs / 1000}
        aria-valuetext={describePosition(props.currentTimeMs, props.durationMs)}
        onKeyDown={(event) => seekByKey(event, props)}
        className="block w-full touch-none rounded bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ height: waveformStripHeightPx }}
        {...pointerHandlers}
      />
      <WaveformZoomControl
        canZoomIn={canZoom(props.visibleSpanMs, "in", props.durationMs)}
        canZoomOut={canZoom(props.visibleSpanMs, "out", props.durationMs)}
        onZoomIn={() => zoom("in")}
        onZoomOut={() => zoom("out")}
      />
    </div>
  );
}

/** Sizes the canvas's bitmap to the device's pixels so that one-pixel lines stay sharp. */
function fitCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  widthPx: number,
) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(widthPx * ratio);
  canvas.height = Math.round(waveformStripHeightPx * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function describePosition(currentTimeMs: number, durationMs: number): string {
  return `${formatPlayerTime(currentTimeMs / 1000)} of ${formatPlayerTime(durationMs / 1000)}`;
}

const keySeekSteps: Record<string, number> = {
  ArrowLeft: -1000,
  ArrowRight: 1000,
};

/** Arrow keys step a second, ten with Shift; Home and End jump to the ends. */
function seekByKey(
  event: KeyboardEvent<HTMLCanvasElement>,
  { currentTimeMs, durationMs, onSeek }: WaveformStripProps,
) {
  const step = keySeekSteps[event.key];
  let target: number | null = null;
  if (step !== undefined)
    target = currentTimeMs + step * (event.shiftKey ? 10 : 1);
  else if (event.key === "Home") target = 0;
  else if (event.key === "End") target = durationMs;
  if (target === null) return;
  event.preventDefault();
  onSeek(Math.min(Math.max(target, 0), durationMs));
}
