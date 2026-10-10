import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ViewportPoint } from "../components/characterAtPoint.ts";
import { hoverMs } from "../components/gestureTiming.ts";
import {
  clickableWordAttribute,
  lookupTriggerAttribute,
} from "../components/lookupTrigger.ts";
import { createPressTracker } from "../components/pressTracker.ts";
import type { WordHit } from "../components/useWordGestures.ts";
import { useWordClickMemory } from "../components/wordClickMemoryContext.tsx";
import { useTimer } from "../hooks/useTimer.ts";
import { type ReaderWord, wordAtPoint } from "./wordAtPoint.ts";

export type { ReaderWord } from "./wordAtPoint.ts";

/** What the user can do to a word of the text, as with the words of the subtitles. */
export type ReaderWordGestures = {
  /** A single click or tap. */
  onWordClick: (word: ReaderWord, input: "mouse" | "touch") => void;
  /** The second click of a double-click or the second tap of a double tap, reported for the word of the first. */
  onWordDoubleClick: (word: ReaderWord) => void;
  /** The word the mouse pointer is over, reported at once each time it changes, and as null when it leaves the words. */
  onWordPointed?: (word: ReaderWord | null) => void;
  /** A mouse pointer that has stayed on the word for the brief moment that tells pointing at it from sweeping across the text. */
  onWordHover: (word: ReaderWord) => void;
  /** A touch held on the word. The click that ends it is not reported. */
  onWordHold: (word: ReaderWord) => void;
};

type WordPointerCallbacks = ReaderWordGestures & {
  /** A click or tap that landed on no word. */
  onBlankClick: (event: MouseEvent<HTMLElement>) => void;
};

/** How far the pointer may travel between press and release for the press to count as a click rather than a drag. */
const clickSlopPx = 10;

/**
 * Turns pointer events on the text into the gestures of `ReaderWordGestures`, with the timing of the subtitles' words.
 * It finds the word under the pointer without wrapping every word in an element, so that long chapters stay quick to lay out.
 * Returns the props for the element that holds the text.
 */
export function useWordPointer(
  chapterIndex: number,
  language: string,
  callbacks: WordPointerCallbacks,
) {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  const hoverTimer = useTimer();
  const [press] = useState(createPressTracker);
  useEffect(() => press.cancelHold, [press]);
  const memory = useWordClickMemory();
  const hovered = useRef<ReaderWord | null>(null);
  const findWord = (point: ViewportPoint) =>
    wordAtPoint(point, chapterIndex, language);
  const reportClick = (
    event: MouseEvent<HTMLElement>,
    word: ReaderWord,
    point: ViewportPoint,
  ) => {
    const input = press.isTouch() ? "touch" : "mouse";
    const first =
      input === "touch"
        ? memory.takeDoubleTap(point)
        : event.detail === 2
          ? memory.take()
          : null;
    if (first) return first.onDoubleClick?.(first.hit);
    const hit: WordHit = {
      word: word.text,
      start: word.location.offset,
      element: event.currentTarget,
      input,
    };
    memory.remember({
      hit,
      point,
      onDoubleClick: () => latest.current.onWordDoubleClick(word),
    });
    latest.current.onWordClick(word, input);
  };
  return {
    // The text opens the dictionary pop-up, so pressing it must not close the pop-up the way pressing elsewhere does.
    [lookupTriggerAttribute]: "",
    [clickableWordAttribute]: "",
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      const word =
        event.pointerType === "mouse" ? null : findWord(pointOf(event));
      press.start(event, () => {
        if (word) latest.current.onWordHold(word);
      });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      press.move(event);
      if (event.pointerType !== "mouse" || event.buttons !== 0) return;
      const word = findWord(pointOf(event));
      if (isSameWord(word, hovered.current)) return;
      hovered.current = word;
      latest.current.onWordPointed?.(word);
      if (!word) return hoverTimer.cancel();
      hoverTimer.restart(hoverMs, () => latest.current.onWordHover(word));
    },
    onPointerLeave: () => {
      if (hovered.current !== null) latest.current.onWordPointed?.(null);
      hovered.current = null;
      hoverTimer.cancel();
      press.cancelHold();
    },
    onPointerUp: press.cancelHold,
    onPointerCancel: press.cancelHold,
    // A long press on a word would otherwise open the browser's menu as well as starting a flashcard.
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (press.isTouch() && findWord(press.origin())) event.preventDefault();
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (press.takeHeld()) return;
      const origin = press.origin();
      const moved = Math.hypot(
        event.clientX - origin.x,
        event.clientY - origin.y,
      );
      if (moved > clickSlopPx || hasSelection()) return;
      // A hover still waiting to report a word would otherwise follow the click.
      hoverTimer.cancel();
      // A finger lands where it came down, which a held tap uses too, rather than where it lifted.
      const point = press.isTouch() ? origin : pointOf(event);
      const word = findWord(point);
      if (word) return reportClick(event, word, point);
      memory.forget();
      latest.current.onBlankClick(event);
    },
  };
}

function pointOf(event: MouseEvent<HTMLElement>): ViewportPoint {
  return { x: event.clientX, y: event.clientY };
}

function isSameWord(a: ReaderWord | null, b: ReaderWord | null): boolean {
  return (
    a?.location.paragraphIndex === b?.location.paragraphIndex &&
    a?.location.offset === b?.location.offset
  );
}

function hasSelection(): boolean {
  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed;
}
