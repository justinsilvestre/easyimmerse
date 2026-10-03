import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformDrag } from "./waveformDrag.ts";
import { constrainDrag } from "./waveformDrag.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { scaledSpan, timeAtX } from "./waveformGeometry.ts";
import { hitTest } from "./waveformHitTest.ts";

/** What the strip reports back from pointer and wheel gestures. */
export type WaveformGestureHandlers = {
  onSeek: (timeMs: number) => void;
  onOpenFlashcardSegment: (segmentId: string) => void;
  onClipEndpointMoved: (
    segmentId: string,
    endpoint: "start" | "end",
    timeMs: number,
  ) => void;
  onScreenshotMarkerMoved: (segmentId: string, timeMs: number) => void;
  onVisibleSpanChange: (spanMs: number) => void;
};

type InteractionInput = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  view: WaveformView;
  durationMs: number;
  segments: readonly FlashcardSegment[];
  handlers: WaveformGestureHandlers;
};

/** A pointer moving less than this many pixels between press and release counts as a click. */
const clickTolerancePx = 4;

type Pinch = { startDistance: number; startSpanMs: number };

/** Turns pointer, double-click, and wheel events on the canvas into seeks, drags, opens, and zooms. */
export function useWaveformInteraction({
  canvasRef,
  view,
  durationMs,
  segments,
  handlers,
}: InteractionInput) {
  const [drag, setDrag] = useState<WaveformDrag | null>(null);
  const pointers = useRef(new Map<number, number>());
  const pinch = useRef<Pinch | null>(null);
  const press = useRef<{ pointerId: number; x: number } | null>(null);
  useWheelZoom(canvasRef, view, durationMs, handlers.onVisibleSpanChange);

  const pointAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointAt(event);
    pointers.current.set(event.pointerId, point.x);
    if (pointers.current.size === 2) {
      pinch.current = {
        startDistance: pointerDistance(pointers.current),
        startSpanMs: view.spanMs,
      };
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
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ hit, timeMs: timeAtX(view, point.x) });
    } else {
      press.current = { pointerId: event.pointerId, x: point.x };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointAt(event);
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, point.x);
    if (pinch.current && pointers.current.size === 2) {
      const factor =
        pinch.current.startDistance / pointerDistance(pointers.current);
      handlers.onVisibleSpanChange(
        scaledSpan(pinch.current.startSpanMs, factor, durationMs),
      );
    } else if (drag) {
      setDrag(
        constrainDrag(
          { ...drag, timeMs: timeAtX(view, point.x) },
          segments,
          durationMs,
        ),
      );
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointAt(event);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag) {
      finishDrag(drag, handlers);
      setDrag(null);
    } else if (
      press.current?.pointerId === event.pointerId &&
      Math.abs(press.current.x - point.x) <= clickTolerancePx
    ) {
      handlers.onSeek(clampTime(timeAtX(view, point.x), durationMs));
    }
    press.current = null;
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const hit = hitTest(view, segments, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    if (hit.kind !== "none") handlers.onOpenFlashcardSegment(hit.segmentId);
  };

  return { drag, onPointerDown, onPointerMove, onPointerUp, onDoubleClick };
}

function finishDrag(drag: WaveformDrag, handlers: WaveformGestureHandlers) {
  const { segmentId, kind } = drag.hit;
  if (kind === "screenshot")
    handlers.onScreenshotMarkerMoved(segmentId, drag.timeMs);
  else
    handlers.onClipEndpointMoved(
      segmentId,
      kind === "clipStart" ? "start" : "end",
      drag.timeMs,
    );
}

function pointerDistance(pointers: ReadonlyMap<number, number>): number {
  const [a = 0, b = 0] = [...pointers.values()];
  return Math.max(1, Math.abs(a - b));
}

function clampTime(timeMs: number, durationMs: number): number {
  return Math.min(Math.max(timeMs, 0), durationMs);
}

/**
 * Zooms on wheel events. The listener is attached by hand because React's wheel listener is passive,
 * and the page must not scroll while the strip zooms.
 */
function useWheelZoom(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  view: WaveformView,
  durationMs: number,
  onVisibleSpanChange: (spanMs: number) => void,
) {
  const latest = useRef({ view, durationMs, onVisibleSpanChange });
  latest.current = { view, durationMs, onVisibleSpanChange };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.min(2, Math.max(0.5, Math.exp(event.deltaY / 100)));
      const current = latest.current;
      current.onVisibleSpanChange(
        scaledSpan(current.view.spanMs, factor, current.durationMs),
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef]);
}
