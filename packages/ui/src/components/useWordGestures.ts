import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTimer } from "../hooks/useTimer.ts";
import { characterOffsetAt, type ViewportPoint } from "./characterAtPoint.ts";
import { hoverMs } from "./gestureTiming.ts";
import { createPressTracker } from "./pressTracker.ts";
import { runLookupStartAt } from "./runLookupStarts.ts";
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
   * The word, or in a run of a script written without spaces the character, that the mouse pointer is over or the keyboard has moved to,
   * reported at once each time it changes. It is reported as null, with the input, when the mouse pointer leaves,
   * or when keyboard focus leaves the text or Escape is pressed. A touch reports nothing.
   */
  onWordPointed?: (hit: WordHit | null, input: WordHit["input"]) => void;
  /**
   * A mouse pointer that has stayed on the word, or on a character of a run, for the brief moment
   * that tells pointing at it from sweeping across the text; or the keyboard moving there, at once.
   */
  onWordHover?: (hit: WordHit) => void;
  /**
   * Looks up from a hit without pointing at it, for the characters of a run that the keyboard steps back over,
   * to find where the run's words begin. It resolves to the length of the text, in UTF-16 code units from the hit,
   * that the lookup matched, or null when nothing matched; or returns null at once when nothing is looked up.
   */
  lookUpMatchedLength?: (hit: WordHit) => Promise<number | null> | null;
  /** A touch held on the word. The click that ends it is not reported. */
  onWordHold?: (hit: WordHit) => void;
};

/**
 * Turns pointer, touch and keyboard events on words into the gestures of `WordGestures`.
 * A text that unmounts while the mouse or the keyboard points at one of its words reports that it no longer points there.
 * Returns a function that builds the event handlers for one word's button,
 * functions through which the keyboard points at a word, or stops pointing, as the mouse does,
 * and one through which the keyboard looks up from a word without pointing at it.
 * In a run of a script written without spaces, each character can begin a word, so the hit starts at the character under the pointer;
 * and moving the mouse to another character of the run restarts the wait for a hover.
 * Enter or Space on a focused word looks up from `cursorStart`, the offset in the text where the lookup cursor lies,
 * when it lies within that word, and from the word's start otherwise.
 */
export function useWordGestures(
  gestures: WordGestures,
  cursorStart: number | null,
) {
  const latest = useRef(gestures);
  latest.current = gestures;
  const hoverTimer = useTimer();
  const [press] = useState(createPressTracker);
  const hovered = useRef<WordHit | null>(null);
  useEffect(
    () => () => {
      press.cancelHold();
      const input = hovered.current?.input;
      if (input) latest.current.onWordPointed?.(null, input);
    },
    [press],
  );
  const memory = useWordClickMemory();
  const pointerHit = (
    part: WordPart,
    element: HTMLElement,
    point: ViewportPoint,
    input: WordHit["input"],
  ) => hitAt(part, element, offsetAtPoint(part, element, point), input);
  const reportClick = (event: MouseEvent<HTMLElement>, hit: WordHit) => {
    const { onWordClick, onWordDoubleClick } = latest.current;
    if (hit.input === "keyboard")
      return (
        event.shiftKey && onWordDoubleClick ? onWordDoubleClick : onWordClick
      )?.(hit);
    const point = pointOf(event);
    const first = firstClickCompletedBy(memory, event, hit, point);
    if (first) return first.onDoubleClick?.(first.hit);
    // A second click whose first landed on no word, or too long ago, counts as a click of its own.
    memory.remember({
      hit,
      point,
      onDoubleClick: onWordDoubleClick ?? onWordClick,
    });
    onWordClick?.(hit);
  };
  const hover = (hit: WordHit) => {
    if (hit.element.isConnected) latest.current.onWordHover?.(hit);
  };
  /** Starts, or restarts for another character, the wait before a mouse on a word counts as hovering. */
  const restartHover = (hit: WordHit) => {
    if (hovered.current?.start === hit.start) return;
    hovered.current = hit;
    latest.current.onWordPointed?.(hit, hit.input);
    hoverTimer.restart(hoverMs, () => hover(hit));
  };
  const cancelHover = () => {
    hovered.current = null;
    hoverTimer.cancel();
  };
  /** Points at a word from the keyboard, which counts as hovering at once, since a key press is never a sweep. */
  const pointWithKeyboard = (hit: WordHit) => {
    hoverTimer.cancel();
    hovered.current = hit;
    latest.current.onWordPointed?.(hit, "keyboard");
    hover(hit);
  };
  const lookUpMatchedLength = (hit: WordHit) =>
    latest.current.lookUpMatchedLength?.(hit) ?? null;
  const endKeyboardPointing = () => {
    if (hovered.current?.input === "keyboard") cancelHover();
    latest.current.onWordPointed?.(null, "keyboard");
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
      if (hovered.current?.input === "mouse") {
        latest.current.onWordPointed?.(null, "mouse");
        cancelHover();
      }
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
        const offset = offsetWithin(part, cursorStart);
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
  });
  return {
    handlersFor,
    pointWithKeyboard,
    endKeyboardPointing,
    lookUpMatchedLength,
  };
}

/** A word of clickable text, as `splitIntoWords` finds it. */
type WordPart = { text: string; start: number; isUnspaced: boolean };

/** How far into a word an offset in the text lies, or 0 when it lies outside the word. */
function offsetWithin(part: WordPart, offset: number | null): number {
  if (offset === null) return 0;
  const within = offset - part.start;
  return within >= 0 && within < part.text.length ? within : 0;
}

/** The hit on a word beginning `offset` code units into it, as within a run of a script written without spaces. */
export function hitAt(
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
 * Where a hit at a point begins within a word: in a run of a script written without spaces, at the lookup start of the character under the point,
 * which is the letter a mark belongs to or the first of a stretch of digits, or at the run's start where no character lies there;
 * in any other word, at its start.
 */
function offsetAtPoint(
  part: WordPart,
  element: HTMLElement,
  point: ViewportPoint,
): number {
  if (!part.isUnspaced) return 0;
  return runLookupStartAt(part.text, characterOffsetAt(element, point) ?? 0);
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
