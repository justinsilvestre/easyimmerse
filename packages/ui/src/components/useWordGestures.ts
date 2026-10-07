import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTimer } from "../hooks/useTimer.ts";
import { characterOffsetAt, type ViewportPoint } from "./characterAtPoint.ts";
import { doubleClickMs, hoverIntentMs } from "./gestureTiming.ts";
import { createPressTracker } from "./pressTracker.ts";
import { useKeyboardStart } from "./useKeyboardStart.ts";
import type { ClickPoint, WordClickMemory } from "./wordClickMemory.ts";
import { useWordClickMemory } from "./wordClickMemoryContext.tsx";

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
  /**
   * A mouse pointer resting on the word for a moment. Passing over it reports nothing.
   * The handler may answer with the length of the text, in UTF-16 code units from the hit, that a lookup from the hit matched,
   * or null when nothing matched, so that the text can highlight the match.
   */
  // A handler with nothing to answer returns nothing, as the other handlers do.
  // biome-ignore lint/suspicious/noConfusingVoidType: see above
  onWordHoverIntent?: (hit: WordHit) => void | Promise<number | null>;
  /**
   * The word, or in a run of a script written without spaces the character, that the mouse pointer is over,
   * reported each time it changes, and as null when the pointer leaves. A touch reports nothing.
   */
  onWordPointed?: (hit: WordHit | null) => void;
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
 * Returns a function that builds the event handlers for one word's button,
 * and the character of a focused run that a lookup from the keyboard starts from.
 * In a run of a script written without spaces, each character can begin a word, so the hit starts at the character under the pointer,
 * or, from the keyboard, at the character that Left and Right have moved to;
 * and moving the mouse to another character of the run restarts the wait for hover intent.
 */
export function useWordGestures(gestures: WordGestures) {
  const latest = useRef(gestures);
  latest.current = gestures;
  const hoverTimer = useTimer();
  const clickTimer = useTimer();
  const [press] = useState(createPressTracker);
  useEffect(() => press.cancelHold, [press]);
  const memory = useWordClickMemory();
  const keyboardStart = useKeyboardStart();
  const pointerHit = (
    part: WordPart,
    element: HTMLElement,
    point: ViewportPoint,
    input: WordHit["input"],
  ) => hitAt(part, element, offsetAtPoint(part, element, point), input);
  const reportClick = (event: MouseEvent<HTMLElement>, hit: WordHit) => {
    const { onWordClick, onWordDoubleClick, defersClick } = latest.current;
    if (hit.input === "keyboard")
      return (
        event.shiftKey && onWordDoubleClick ? onWordDoubleClick : onWordClick
      )?.(hit);
    const point = pointOf(event);
    const first = firstClickCompletedBy(memory, event, hit, point);
    if (first) {
      first.cancel();
      return first.onDoubleClick?.(first.hit);
    }
    // A second click whose first landed on no word, or too long ago, counts as a click of its own.
    memory.remember({
      hit,
      point,
      onDoubleClick: onWordDoubleClick ?? onWordClick,
      cancel: clickTimer.cancel,
    });
    if (!defersClick) return onWordClick?.(hit);
    latest.current.onWordClickStarted?.(hit);
    clickTimer.restart(doubleClickMs, () => latest.current.onWordClick?.(hit));
  };
  const hovered = useRef<WordHit | null>(null);
  /** Starts, or restarts for another character, the wait before a mouse resting on a word counts as hover intent. */
  const restartHover = (hit: WordHit) => {
    if (hovered.current?.start === hit.start) return;
    hovered.current = hit;
    latest.current.onWordPointed?.(hit);
    hoverTimer.restart(hoverIntentMs, () => {
      if (hit.element.isConnected) latest.current.onWordHoverIntent?.(hit);
    });
  };
  const handlersFor = (part: WordPart) => ({
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      hovered.current = null;
      restartHover(
        pointerHit(part, event.currentTarget, pointOf(event), "mouse"),
      );
    },
    onPointerLeave: () => {
      if (hovered.current !== null) latest.current.onWordPointed?.(null);
      hovered.current = null;
      hoverTimer.cancel();
      press.cancelHold();
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      const hit = pointerHit(
        part,
        event.currentTarget,
        pointOf(event),
        "touch",
      );
      press.start(event, () => {
        if (hit.element.isConnected) latest.current.onWordHold?.(hit);
      });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      press.move(event);
      if (event.pointerType === "mouse" && part.isUnspaced)
        restartHover(
          pointerHit(part, event.currentTarget, pointOf(event), "mouse"),
        );
    },
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
      if (isKeyboard) {
        const offset = keyboardStart.offsetIn(part) ?? 0;
        return reportClick(
          event,
          hitAt(part, event.currentTarget, offset, "keyboard"),
        );
      }
      const input = press.isTouch() ? "touch" : "mouse";
      // A finger lands where it came down, which a held tap uses too, rather than where it lifted.
      const point = input === "touch" ? press.origin() : pointOf(event);
      reportClick(event, pointerHit(part, event.currentTarget, point, input));
    },
    ...(part.isUnspaced && {
      onFocus: () => keyboardStart.focus(part),
      onBlur: () => keyboardStart.blur(part),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (keyboardStart.move(part, event)) event.preventDefault();
      },
    }),
  });
  return { handlersFor, keyboardStart };
}

/** A word of clickable text, as `splitIntoWords` finds it. */
type WordPart = { text: string; start: number; isUnspaced: boolean };

/** The hit on a word beginning `offset` code units into it, as within a run of a script written without spaces. */
function hitAt(
  part: WordPart,
  element: HTMLElement,
  offset: number,
  input: WordHit["input"],
): WordHit {
  return {
    word: part.text.slice(offset),
    start: part.start + offset,
    element,
    input,
  };
}

/**
 * Where a hit at a point begins within a word: in a run of a script written without spaces, at the character under the point,
 * or at the run's start where no character lies there; in any other word, at its start.
 */
function offsetAtPoint(
  part: WordPart,
  element: HTMLElement,
  point: ViewportPoint,
): number {
  return part.isUnspaced ? (characterOffsetAt(element, point) ?? 0) : 0;
}

function pointOf(event: MouseEvent<HTMLElement>): ViewportPoint {
  return { x: event.clientX, y: event.clientY };
}

/**
 * The first click that this click makes a double-click, if any.
 * The browser's count decides for a mouse; a tap counts by its time and place, since browsers count taps unreliably.
 */
function firstClickCompletedBy(
  memory: WordClickMemory,
  event: MouseEvent<HTMLElement>,
  hit: WordHit,
  point: ClickPoint,
) {
  if (hit.input === "touch") return memory.takeDoubleTap(point);
  return event.detail === 2 ? memory.take() : null;
}
