import type { MouseEvent, RefObject } from "react";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import { useWaveformPointers } from "./useWaveformPointers.ts";
import { useWheelZoom } from "./useWheelZoom.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import type { WaveformGestureHandlers } from "./waveformGestureHandlers.ts";
import { hitTest } from "./waveformHitTest.ts";

type InteractionInput = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  view: WaveformView;
  durationMs: number;
  segments: readonly FlashcardSegment[];
  handlers: WaveformGestureHandlers;
};

/** Turns pointer, double-click, and wheel events on the canvas into seeks, drags, opens, and zooms. */
export function useWaveformInteraction({
  canvasRef,
  ...pointerInput
}: InteractionInput) {
  const { view, durationMs, segments, handlers } = pointerInput;
  useWheelZoom(canvasRef, view, durationMs, handlers.onVisibleSpanChange);
  const pointers = useWaveformPointers(pointerInput);

  const onDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const hit = hitTest(view, segments, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    if (hit.kind !== "none") handlers.onOpenFlashcardSegment(hit.segmentId);
  };

  return { ...pointers, onDoubleClick };
}
