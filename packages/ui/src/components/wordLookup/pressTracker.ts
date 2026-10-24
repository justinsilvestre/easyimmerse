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
    /**
     * Starts a press; a touch that stays put for `holdMs` calls `onHold`, and so does a mouse press when `timesMouse` is set.
     * When `onHold` returns false it did nothing, and the click that ends the press is reported as usual.
     */
    start(
      point: PointerPoint,
      // biome-ignore lint/suspicious/noConfusingVoidType: most callers return nothing, which counts as handling the hold.
      onHold: () => boolean | void,
      timesMouse = false,
    ) {
      press = {
        x: point.clientX,
        y: point.clientY,
        isTouch: point.pointerType !== "mouse",
        isHeld: false,
      };
      if (!press.isTouch && !timesMouse) return;
      holdTimer.restart(holdMs, () => {
        press.isHeld = onHold() !== false;
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
    /** Where the last press came down. */
    origin: () => ({ x: press.x, y: press.y }),
    /** Whether the last press came from a touch or a pen rather than a mouse. */
    isTouch: () => press.isTouch,
    /** Tells, once, whether the last press was held, whose closing click is then dropped. */
    takeHeld(): boolean {
      const isHeld = press.isHeld;
      press.isHeld = false;
      return isHeld;
    },
  };
}
