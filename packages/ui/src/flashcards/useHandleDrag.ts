import {
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  type ClipEditorView,
  draggedHandle,
  type WaveformFrame,
  xOfTime,
} from "./clipView.ts";

/** A time a handle stands for: where it is, how far it may go, and what to do with where it is dragged to. */
export type DraggableTime = {
  valueMs: number;
  constrain: (ms: number) => number;
  apply: (ms: number) => void;
};

/** The pointer handlers that make an element drag a time. */
export type DragHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
};

type Drag = DraggableTime & {
  pointerId: number;
  frame: WaveformFrame;
  grabOffsetPx: number;
  x: number;
  view: ClipEditorView;
  lastMs: number;
  lastFrameAt: number | null;
  animationFrame: number;
};

/**
 * Lets handles on a waveform be dragged. Where the waveform sits and where the handle was grabbed are fixed
 * when a drag starts, so the handle keeps to the pointer. While a handle is held past an edge of the waveform,
 * the view widens on every animation frame.
 */
export function useHandleDrag({
  waveformRef,
  view,
  durationMs,
  onViewChange,
  onDragEnd,
}: {
  waveformRef: RefObject<HTMLElement | null>;
  view: ClipEditorView;
  durationMs: number;
  onViewChange: (view: ClipEditorView) => void;
  /** Called once the pointer lets go of a handle, after the last move has been applied. */
  onDragEnd: () => void;
}): (time: DraggableTime) => DragHandlers {
  const dragRef = useRef<Drag | null>(null);

  useEffect(
    () => () => {
      if (dragRef.current) cancelAnimationFrame(dragRef.current.animationFrame);
    },
    [],
  );

  const step = useCallback(
    (elapsedMs: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = draggedHandle({ ...drag, elapsedMs, durationMs });
      dragRef.current = { ...drag, view: next.view, lastMs: next.ms };
      if (next.view !== drag.view) onViewChange(next.view);
      if (next.ms !== drag.lastMs) drag.apply(next.ms);
    },
    [durationMs, onViewChange],
  );

  const tick = useCallback(
    (now: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      step(drag.lastFrameAt === null ? 0 : now - drag.lastFrameAt);
      if (dragRef.current)
        dragRef.current = {
          ...dragRef.current,
          lastFrameAt: now,
          animationFrame: requestAnimationFrame(tick),
        };
    },
    [step],
  );

  const end = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    cancelAnimationFrame(drag.animationFrame);
    dragRef.current = null;
    onDragEnd();
  };

  return (time) => ({
    onPointerDown: (event) => {
      const rect = waveformRef.current?.getBoundingClientRect();
      if (event.button !== 0 || !rect || rect.width === 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const frame = { left: rect.left, width: rect.width };
      const grabOffsetPx = event.clientX - xOfTime(frame, view, time.valueMs);
      if (dragRef.current) cancelAnimationFrame(dragRef.current.animationFrame);
      onViewChange(view);
      dragRef.current = {
        ...time,
        pointerId: event.pointerId,
        frame,
        grabOffsetPx,
        x: event.clientX - grabOffsetPx,
        view,
        lastMs: time.valueMs,
        lastFrameAt: null,
        animationFrame: requestAnimationFrame(tick),
      };
    },
    onPointerMove: (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = { ...drag, x: event.clientX - drag.grabOffsetPx };
      step(0);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  });
}
