import { type PointerEvent, useRef, useState } from "react";
import type { PageTurner } from "./PagedChapter.tsx";

/** How far a finger must travel sideways before the page follows it. */
const dragStartPx = 8;
/** How far a released drag must have gone to turn the page. */
const turnPx = 48;

/**
 * Lets a finger drag the page sideways and turn it on release.
 * Mouse drags are left alone, so that they still select text.
 */
export function useSwipe(turner: PageTurner) {
  const [dragX, setDragX] = useState(0);
  const start = useRef<{ x: number; y: number; isDragging: boolean } | null>(
    null,
  );
  const end = () => {
    const isDragging = start.current?.isDragging;
    start.current = null;
    setDragX(0);
    return isDragging;
  };
  return {
    dragX,
    isDragging: dragX !== 0,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === "mouse") return;
        start.current = {
          x: event.clientX,
          y: event.clientY,
          isDragging: false,
        };
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const from = start.current;
        if (!from) return;
        const dx = event.clientX - from.x;
        const isSideways = Math.abs(dx) > Math.abs(event.clientY - from.y);
        if (!from.isDragging && isSideways && Math.abs(dx) > dragStartPx) {
          from.isDragging = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (from.isDragging) setDragX(dx);
      },
      onPointerUp: () => {
        const dx = dragX;
        if (!end()) return;
        if (dx <= -turnPx) turner.next();
        else if (dx >= turnPx) turner.previous();
      },
      onPointerCancel: () => {
        end();
      },
    },
  };
}
