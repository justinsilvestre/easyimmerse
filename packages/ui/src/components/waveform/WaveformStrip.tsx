import type { Cue } from "@easyimmerse/types";
import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { formatPlayerTime } from "../formatPlayerTime.ts";
import { barPeaksInView } from "./barPeaksInView.ts";
import { drawWaveformOverlay } from "./drawWaveformOverlay.ts";
import { fitCanvas } from "./fitCanvas.ts";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import { useElementSize } from "./useElementSize.ts";
import { useWaveformInteraction } from "./useWaveformInteraction.ts";
import { WaveformBars } from "./WaveformBars.tsx";
import { WaveformZoomControl } from "./WaveformZoomControl.tsx";
import { applyDrag } from "./waveformDrag.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { canZoom, computeViewStart, zoomedSpan } from "./waveformGeometry.ts";
import type { WaveformGestureHandlers } from "./waveformGestureHandlers.ts";

const waveformStripHeightPx = 72;

/** The media's duration and position in milliseconds, with the peaks windows held so far by their start. */
export type WaveformStripProps = WaveformGestureHandlers & {
  durationMs: number;
  currentTimeMs: number;
  windows: ReadonlyMap<number, Uint8Array>;
  cues: readonly Cue[];
  flashcardSegments: readonly FlashcardSegment[];
  /** The segment of the flashcard open in the editor, the only one whose handles can be dragged. None when left out. */
  editableSegmentId?: string | null;
  /** The span of media shown, already clamped by the caller through `clampVisibleSpan`. */
  visibleSpanMs: number;
};

/**
 * Draws the audio peaks around the current time as bars, with the cues and flashcard segments over them.
 * Clicking seeks, to the start of a cue when one is clicked in the band along the bottom; double-clicking a segment opens it,
 * and the open segment's handles drag; the wheel, a pinch, or the corner control zooms.
 */
export function WaveformStrip(props: WaveformStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { widthPx } = useElementSize(containerRef);
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
    heightPx: waveformStripHeightPx,
    durationMs: props.durationMs,
    cues: props.cues,
    segments: props.flashcardSegments,
    editableSegmentId: props.editableSegmentId ?? null,
    handlers: props,
  });
  const segments = applyDrag(props.flashcardSegments, drag);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || widthPx === 0) return;
    fitCanvas(canvas, ctx, { widthPx, heightPx: waveformStripHeightPx });
    drawWaveformOverlay(ctx, {
      view,
      heightPx: waveformStripHeightPx,
      currentTimeMs: props.currentTimeMs,
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
      {/* The bars stay dark in both themes, as the colors drawn over them assume. */}
      <div
        data-theme="dark"
        className="absolute inset-0 overflow-hidden rounded-md bg-surface-muted"
      >
        {widthPx > 0 && (
          <WaveformBars {...barPeaksInView(props.windows, view)} />
        )}
      </div>
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
        className="relative block w-full touch-none rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
