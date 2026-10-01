import type { PlayerLoop } from "@easyimmerse/state";

/** Seeks the element to the loop's restart time when its time lies outside the loop's range. Does nothing without a loop. */
export function keepWithinLoop(
  element: HTMLMediaElement,
  loop: PlayerLoop | null,
) {
  if (loop === null) return;
  const timeMs = toMs(element.currentTime);
  const { range } = loop;
  if (timeMs < range.start_ms || timeMs >= range.end_ms)
    element.currentTime = loop.restartMs / 1000;
}

export function toMs(seconds: number): number {
  return Math.round(seconds * 1000);
}
