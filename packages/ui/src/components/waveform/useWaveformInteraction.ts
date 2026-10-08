import type { Cue } from "@easyimmerse/types";
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
  heightPx: number;
  durationMs: number;
  cues: readonly Cue[];
  segments: readonly FlashcardSegment[];
  /** The segment whose handles can be dragged, the flashcard open in the editor, or null when none is open. */
  editableSegmentId: string | null;
  handlers: WaveformGestureHandlers;
};

/**
 * Turns pointer, double-click, and wheel events on the canvas into seeks, drags, opens, and zooms.
 * A double-click opens the segment under it, any segment's body or the open one's handle.
 */
export function useWaveformInteraction({
  canvasRef,
  ...pointerInput
}: InteractionInput) {
  const { view, durationMs, segments, editableSegmentId, handlers } =
    pointerInput;
  useWheelZoom(canvasRef, view, durationMs, handlers.onVisibleSpanChange);
  const pointers = useWaveformPointers(pointerInput);

  const onDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const hit = hitTest(
      view,
      segments,
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      editableSegmentId,
    );
    if (hit.kind !== "none") handlers.onOpenFlashcardSegment(hit.segmentId);
  };

  return { ...pointers, onDoubleClick };
}
