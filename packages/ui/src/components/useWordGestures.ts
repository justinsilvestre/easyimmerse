import { type MouseEvent, type PointerEvent, useEffect, useRef } from "react";

/** A word the user acted on, with the element that shows it, so that a pop-up can be placed at it. */
export type WordHit = {
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  /** Whether the word was activated from the keyboard, so that no double-click can follow. */
  isKeyboard: boolean;
};

/** What the user can do to a word, each reported once. */
export type WordGestures = {
  /** A single click or tap, or Enter or Space on the focused word. */
  onWordClick?: (hit: WordHit) => void;
  /** The second click of a double-click. Without this handler it counts as another click. */
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
};

export const hoverIntentMs = 150;
export const holdMs = 500;
/** About the double-click interval of common systems. */
const doubleClickMs = 300;
/** How far a touch may move before it counts as a scroll rather than a held tap. */
const holdSlopPx = 10;

type Timer = ReturnType<typeof setTimeout> | undefined;

/**
 * Turns pointer, touch and keyboard events on words into the gestures of `WordGestures`.
 * Returns a function that builds the event handlers for one word's button.
 */
export function useWordGestures(gestures: WordGestures) {
  const latest = useRef(gestures);
  latest.current = gestures;
  const timers = useRef({
    hover: undefined as Timer,
    hold: undefined as Timer,
    click: undefined as Timer,
  });
  const touch = useRef({ x: 0, y: 0, isHeld: false, isTouch: false });
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer);
    };
  }, []);
  const restart = (
    name: keyof typeof timers.current,
    ms: number,
    callback: () => void,
  ) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = setTimeout(callback, ms);
  };
  const cancel = (name: keyof typeof timers.current) =>
    clearTimeout(timers.current[name]);
  return (word: string, start: number) => {
    const hitOf = (element: HTMLElement, isKeyboard = false): WordHit => ({
      word,
      start,
      element,
      isKeyboard,
    });
    return {
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "mouse") return;
        const hit = hitOf(event.currentTarget);
        restart("hover", hoverIntentMs, () =>
          latest.current.onWordHoverIntent?.(hit),
        );
      },
      onPointerLeave: () => {
        cancel("hover");
        cancel("hold");
      },
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        touch.current = {
          x: event.clientX,
          y: event.clientY,
          isHeld: false,
          isTouch: event.pointerType !== "mouse",
        };
        if (!touch.current.isTouch) return;
        const hit = hitOf(event.currentTarget);
        restart("hold", holdMs, () => {
          touch.current.isHeld = true;
          latest.current.onWordHold?.(hit);
        });
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const distance = Math.hypot(
          event.clientX - touch.current.x,
          event.clientY - touch.current.y,
        );
        if (distance > holdSlopPx) cancel("hold");
      },
      onPointerUp: () => cancel("hold"),
      onPointerCancel: () => cancel("hold"),
      // A long press on a touch screen would otherwise open the browser's menu for the word.
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (touch.current.isTouch) event.preventDefault();
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (touch.current.isHeld) {
          touch.current.isHeld = false;
          return;
        }
        const hit = hitOf(event.currentTarget, event.detail === 0);
        const { onWordClick, onWordDoubleClick, defersClick } = latest.current;
        if (event.detail === 2 && onWordDoubleClick) {
          cancel("click");
          onWordDoubleClick(hit);
        } else if (event.detail > 2) {
          return;
        } else if (defersClick && event.detail > 0) {
          restart("click", doubleClickMs, () => onWordClick?.(hit));
        } else {
          onWordClick?.(hit);
        }
      },
    };
  };
}
