import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformDrag } from "./waveformDrag.ts";
import { constrainDrag } from "./waveformDrag.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { timeAtX } from "./waveformGeometry.ts";
import type { WaveformGestureHandlers } from "./waveformGestureHandlers.ts";
import { reportDragEnd } from "./waveformGestureHandlers.ts";
import { hitTest } from "./waveformHitTest.ts";
import type { WaveformPinch } from "./waveformPinch.ts";
import { pinchedSpan, startPinch } from "./waveformPinch.ts";

type PointersInput = {
  view: WaveformView;
  durationMs: number;
  segments: readonly FlashcardSegment[];
  handlers: WaveformGestureHandlers;
};

type CanvasPointerEvent = ReactPointerEvent<HTMLCanvasElement>;

/** A pointer moving less than this many pixels between press and release counts as a click. */
const clickTolerancePx = 4;

/** Turns pointer events on the canvas into seeks, handle drags, and pinch zooms. */
export function useWaveformPointers({
  view,
  durationMs,
  segments,
  handlers,
}: PointersInput) {
  const [drag, setDrag] = useState<WaveformDrag | null>(null);
  const pointerXs = useRef(new Map<number, number>());
  const pinch = useRef<WaveformPinch | null>(null);
  const press = useRef<{ pointerId: number; x: number } | null>(null);

  const onPointerDown = (event: CanvasPointerEvent) => {
    const point = pointAt(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerXs.current.set(event.pointerId, point.x);
    if (pointerXs.current.size === 2) {
      pinch.current = startPinch(pointerXs.current, view.spanMs);
      press.current = null;
      setDrag(null);
      return;
    }
    const hit = hitTest(view, segments, point);
    if (
      hit.kind === "clipStart" ||
      hit.kind === "clipEnd" ||
      hit.kind === "screenshot"
    ) {
      setDrag({ hit, timeMs: timeAtX(view, point.x) });
    } else {
      press.current = { pointerId: event.pointerId, x: point.x };
    }
  };

  const onPointerMove = (event: CanvasPointerEvent) => {
    const point = pointAt(event);
    if (!pointerXs.current.has(event.pointerId)) return;
    pointerXs.current.set(event.pointerId, point.x);
    if (pinch.current && pointerXs.current.size === 2) {
      handlers.onVisibleSpanChange(
        pinchedSpan(pinch.current, pointerXs.current, durationMs),
      );
    } else if (drag) {
      const moved = { ...drag, timeMs: timeAtX(view, point.x) };
      setDrag(constrainDrag(moved, segments, durationMs));
    }
  };

  const onPointerUp = (event: CanvasPointerEvent) => {
    const point = pointAt(event);
    pointerXs.current.delete(event.pointerId);
    if (pointerXs.current.size < 2) pinch.current = null;
    if (drag) {
      reportDragEnd(drag, handlers);
      setDrag(null);
    } else if (
      press.current?.pointerId === event.pointerId &&
      Math.abs(press.current.x - point.x) <= clickTolerancePx
    ) {
      handlers.onSeek(clampTime(timeAtX(view, point.x), durationMs));
    }
    press.current = null;
  };

  /** A pointer the browser took away, as when a touch turns into a scroll, ends every gesture it was part of. */
  const onPointerCancel = (event: CanvasPointerEvent) => {
    pointerXs.current.delete(event.pointerId);
    pinch.current = null;
    press.current = null;
    setDrag(null);
  };

  return { drag, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}

function pointAt(event: CanvasPointerEvent) {
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function clampTime(timeMs: number, durationMs: number): number {
  return Math.min(Math.max(timeMs, 0), durationMs);
}
