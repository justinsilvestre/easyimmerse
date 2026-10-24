import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WordSpan } from "../../components/splitAtWords.ts";
import type { ViewportPoint } from "../../components/wordLookup/characterAtPoint.ts";
import { hoverMs } from "../../components/wordLookup/gestureTiming.ts";
import {
  clickableWordAttribute,
  lookupTriggerAttribute,
} from "../../components/wordLookup/lookupTrigger.ts";
import { createPressTracker } from "../../components/wordLookup/pressTracker.ts";
import { useTimer } from "../../components/wordLookup/useTimer.ts";
import type { WordHit } from "../../components/wordLookup/useWordGestures.ts";
import { useWordClickMemory } from "../../components/wordLookup/wordClickMemoryContext.tsx";
import { type ReaderWord, wordAtPoint } from "./wordAtPoint.ts";

export type { ReaderWord } from "./wordAtPoint.ts";

/** What the user can do to a word of the text, as with the words of the subtitles. */
export type ReaderWordGestures = {
  /** A single click or tap. */
  onWordClick: (word: ReaderWord, input: "mouse" | "touch") => void;
  /** The second click of a double-click or the second tap of a double tap, reported for the word of the first. */
  onWordDoubleClick: (word: ReaderWord) => void;
  /**
   * The word the mouse pointer is over, or the keyboard has moved to, reported at once each time it changes,
   * and as null, with the input, when the mouse leaves the words or the keyboard's cursor leaves the text.
   */
  onWordPointed?: (
    word: ReaderWord | null,
    input: "mouse" | "keyboard",
  ) => void;
  /**
   * A mouse pointer that has stayed on the word for the brief moment that tells pointing at it from sweeping across the text,
   * or the keyboard moving there, at once.
   */
  onWordHover: (word: ReaderWord) => void;
  /**
   * Looks up from a word without pointing at it, for the characters of a run that the keyboard steps back over,
   * to find where the run's words begin. It resolves to the length of the text, in UTF-16 code units from the word's start,
   * that the lookup matched, or null when nothing matched; or returns null at once when nothing is looked up.
   */
  lookUpMatchedLength?: (
    word: Pick<ReaderWord, "text" | "lookup">,
  ) => Promise<number | null> | null;
  /** A touch, or the mouse button, held on the word. The click that ends it is not reported. */
  onWordHold: (word: ReaderWord) => void;
};

type WordPointerCallbacks = ReaderWordGestures & {
  /** A click or tap that landed on no word. */
  onBlankClick: (event: MouseEvent<HTMLElement>) => void;
  /** A mouse click on a word with Ctrl or Cmd held. Without it, such a click counts as a plain click. */
  onWordCommandClick?: (word: ReaderWord) => void;
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
  /** The stored words of the chapter's paragraphs, as for a library document, which alone are words. */
  storedWords?: readonly (readonly WordSpan[])[],
) {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  const hoverTimer = useTimer();
  const [press] = useState(createPressTracker);
  useEffect(() => press.cancelHold, [press]);
  const memory = useWordClickMemory();
  const hovered = useRef<ReaderWord | null>(null);
  const findWord = (point: ViewportPoint) =>
    wordAtPoint(point, chapterIndex, language, storedWords);
  const reportClick = (
    event: MouseEvent<HTMLElement>,
    word: ReaderWord,
    point: ViewportPoint,
  ) => {
    const input = press.isTouch() ? "touch" : "mouse";
    const { onWordCommandClick } = latest.current;
    if (
      input === "mouse" &&
      onWordCommandClick &&
      (event.ctrlKey || event.metaKey)
    ) {
      memory.forget();
      return onWordCommandClick(word);
    }
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
      if (event.pointerType === "mouse") {
        // The word is found only once the press has lasted, since most mouse presses are quick clicks.
        // A press beside the words is not held, so that the click ending it still turns the page or shows the toolbar.
        press.start(
          event,
          () => {
            const word = findWord(press.origin());
            if (word === null) return false;
            latest.current.onWordHold(word);
          },
          event.button === 0,
        );
        return;
      }
      const word = findWord(pointOf(event));
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
      latest.current.onWordPointed?.(word, "mouse");
      if (!word) return hoverTimer.cancel();
      hoverTimer.restart(hoverMs, () => latest.current.onWordHover(word));
    },
    onPointerLeave: () => {
      if (hovered.current !== null)
        latest.current.onWordPointed?.(null, "mouse");
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
