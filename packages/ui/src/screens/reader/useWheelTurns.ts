import { useRef, type WheelEvent } from "react";
import type { PageTurner } from "./PagedChapter.tsx";

/** How far the wheel must scroll to turn one page. */
const turnDelta = 40;
/** How long the wheel must rest before another turn, so that a trackpad's momentum turns only one page per flick. */
const restMs = 180;

/** Turns the page when the wheel or trackpad scrolls, one page per gesture. */
export function useWheelTurns(turner: PageTurner) {
  const gesture = useRef({ delta: 0, hasTurned: false, lastAt: 0 });
  return (event: WheelEvent<HTMLElement>) => {
    const current = gesture.current;
    if (event.timeStamp - current.lastAt > restMs) {
      current.delta = 0;
      current.hasTurned = false;
    }
    current.lastAt = event.timeStamp;
    if (current.hasTurned) return;
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    current.delta += delta;
    if (Math.abs(current.delta) < turnDelta) return;
    current.hasTurned = true;
    if (current.delta > 0) turner.next();
    else turner.previous();
  };
}
