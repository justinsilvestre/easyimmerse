import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTimer } from "../hooks/useTimer.ts";
import { doubleClickMs, hoverIntentMs } from "./gestureTiming.ts";
import { createPressTracker } from "./pressTracker.ts";
import {
  type ClickPoint,
  rememberFirstClick,
  takeDoubleTap,
  takeFirstClick,
} from "./wordClickMemory.ts";

/** A word the user acted on, with the element that shows it, so that a pop-up can be placed at it. */
export type WordHit = {
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
};

/** What the user can do to a word, each reported once. */
export type WordGestures = {
  /** A single click or tap, or Enter or Space on the focused word. */
  onWordClick?: (hit: WordHit) => void;
  /**
   * The second click of a double-click or the second tap of a double tap, reported for the word of the first;
   * or Shift+Enter or Shift+Space on the focused word.
   * Without this handler a double-click counts as another click.
   */
  onWordDoubleClick?: (hit: WordHit) => void;
  /** A mouse pointer resting on the word for a moment. Passing over it reports nothing. */
  onWordHoverIntent?: (hit: WordHit) => void;
  /** A touch held on the word. The click that ends it is not reported. */
  onWordHold?: (hit: WordHit) => void;
  /**
   * Holds a pointer click back until the double-click interval has passed, and drops it when a double-click follows.
   * Use it where a click changes the text under the pointer, so that the second click of a double-click still lands on the word.
   */
  defersClick?: boolean;
  /** A click that `defersClick` holds back, reported at once, so that work such as a lookup can begin. */
  onWordClickStarted?: (hit: WordHit) => void;
};

/**
 * Turns pointer, touch and keyboard events on words into the gestures of `WordGestures`.
 * Returns a function that builds the event handlers for one word's button.
 */
export function useWordGestures(gestures: WordGestures) {
  const latest = useRef(gestures);
  latest.current = gestures;
  const hoverTimer = useTimer();
  const clickTimer = useTimer();
  const [press] = useState(createPressTracker);
  useEffect(() => press.cancelHold, [press]);
  const reportClick = (event: MouseEvent<HTMLElement>, hit: WordHit) => {
    const { onWordClick, onWordDoubleClick, defersClick } = latest.current;
    if (hit.input === "keyboard")
      return (
        event.shiftKey && onWordDoubleClick ? onWordDoubleClick : onWordClick
      )?.(hit);
    const point = { x: event.clientX, y: event.clientY };
    const first = firstClickCompletedBy(event, hit, point);
    if (first) {
      first.cancel();
      return first.onDoubleClick?.(first.hit);
    }
    if (event.detail > 1 && hit.input === "mouse") return;
    rememberFirstClick({
      hit,
      point,
      onDoubleClick: onWordDoubleClick ?? onWordClick,
      cancel: clickTimer.cancel,
    });
    if (!defersClick) return onWordClick?.(hit);
    latest.current.onWordClickStarted?.(hit);
    clickTimer.restart(doubleClickMs, () => latest.current.onWordClick?.(hit));
  };
  return (word: string, start: number) => {
    const hitOf = (element: HTMLElement, input: WordHit["input"]): WordHit => ({
      word,
      start,
      element,
      input,
    });
    return {
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "mouse") return;
        const hit = hitOf(event.currentTarget, "mouse");
        hoverTimer.restart(hoverIntentMs, () => {
          if (hit.element.isConnected) latest.current.onWordHoverIntent?.(hit);
        });
      },
      onPointerLeave: () => {
        hoverTimer.cancel();
        press.cancelHold();
      },
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        const hit = hitOf(event.currentTarget, "touch");
        press.start(event, () => {
          if (hit.element.isConnected) latest.current.onWordHold?.(hit);
        });
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => press.move(event),
      onPointerUp: press.cancelHold,
      onPointerCancel: press.cancelHold,
      // A long press on a touch screen would otherwise open the browser's menu for the word.
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (press.isTouch()) event.preventDefault();
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        // A key press is never the end of a held tap, however a touch before it ended.
        const isKeyboard = event.detail === 0;
        if (!isKeyboard && press.takeHeld()) return;
        const input = isKeyboard
          ? "keyboard"
          : press.isTouch()
            ? "touch"
            : "mouse";
        reportClick(event, hitOf(event.currentTarget, input));
      },
    };
  };
}

/**
 * The first click that this click makes a double-click, if any.
 * The browser's count decides for a mouse; a tap counts by its time and place, since browsers count taps unreliably.
 */
function firstClickCompletedBy(
  event: MouseEvent<HTMLElement>,
  hit: WordHit,
  point: ClickPoint,
) {
  if (hit.input === "touch") return takeDoubleTap(point);
  return event.detail === 2 ? takeFirstClick() : null;
}
