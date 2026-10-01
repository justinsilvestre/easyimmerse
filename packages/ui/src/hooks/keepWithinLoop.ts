import type { TimeRange } from "@easyimmerse/types";

/** Seeks the element to the loop's start when its time lies outside the loop. Does nothing without a loop. */
export function keepWithinLoop(
  element: HTMLMediaElement,
  loop: TimeRange | null,
) {
  if (loop === null) return;
  const timeMs = toMs(element.currentTime);
  if (timeMs < loop.start_ms || timeMs >= loop.end_ms)
    element.currentTime = loop.start_ms / 1000;
}

export function toMs(seconds: number): number {
  return Math.round(seconds * 1000);
}
