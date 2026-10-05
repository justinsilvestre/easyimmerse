import { holdMs } from "./gestureTiming.ts";
import { createTimer } from "./timer.ts";

/** How far a touch may move before it counts as a scroll rather than a held tap. */
const holdSlopPx = 10;

type PointerPoint = { clientX: number; clientY: number; pointerType: string };

/** Follows one pointer press on a word, to tell a held tap from a tap or a scroll. */
export function createPressTracker() {
  const holdTimer = createTimer();
  let press = { x: 0, y: 0, isTouch: false, isHeld: false };
  return {
    /** Starts a press; a touch that stays put for `holdMs` calls `onHold`. */
    start(point: PointerPoint, onHold: () => void) {
      press = {
        x: point.clientX,
        y: point.clientY,
        isTouch: point.pointerType !== "mouse",
        isHeld: false,
      };
      if (!press.isTouch) return;
      holdTimer.restart(holdMs, () => {
        press.isHeld = true;
        onHold();
      });
    },
    move(point: PointerPoint) {
      const distance = Math.hypot(
        point.clientX - press.x,
        point.clientY - press.y,
      );
      if (distance > holdSlopPx) holdTimer.cancel();
    },
    cancelHold: holdTimer.cancel,
    /** Whether the last press came from a touch or a pen rather than a mouse. */
    isTouch: () => press.isTouch,
    /** Tells, once, whether the last press was a held tap, whose closing click is then dropped. */
    takeHeld(): boolean {
      const isHeld = press.isHeld;
      press.isHeld = false;
      return isHeld;
    },
  };
}
