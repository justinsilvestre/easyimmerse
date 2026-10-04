import { type MouseEvent, type PointerEvent, useEffect, useRef } from "react";
import type { ReaderLocation } from "./readingProgress.ts";
import {
  caretAtPoint,
  offsetWithin,
  paragraphAttribute,
  paragraphIndexOf,
  rangeOfSpan,
} from "./textOffsets.ts";
import { sentenceAt, wordAt } from "./wordAt.ts";

/** A word in the text, with the sentence around it for a flashcard's context. */
export type ReaderWord = {
  text: string;
  sentence: string;
  location: ReaderLocation;
  /** Where the word is drawn in the window, for placing the dictionary pop-up. */
  rect: DOMRect;
};

export type WordPointerCallbacks = {
  onWordHover: (word: ReaderWord) => void;
  onWordClick: (word: ReaderWord) => void;
  /** A click or tap that landed on no word. */
  onBlankClick: (event: MouseEvent<HTMLElement>) => void;
};

/** How long the mouse must rest on a word before it is looked up, so that sweeping across the text does not flash the pop-up. */
const hoverDelayMs = 120;
const doubleTapMs = 350;
/** How far the pointer may travel between press and release for the press to count as a click rather than a drag. */
const clickSlopPx = 10;
const highlightName = "reader-word";

/**
 * Finds the word under the pointer without wrapping every word in an element, so that long
 * chapters stay quick to lay out. A mouse looks a word up by resting on it and makes a
 * flashcard by clicking it; a finger looks a word up by tapping and makes a flashcard by
 * tapping twice.
 */
export function useWordPointer(
  chapterIndex: number,
  language: string,
  callbacks: WordPointerCallbacks,
) {
  const hoveredWord = useRef<ReaderWord | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const press = useRef({ x: 0, y: 0, pointerType: "mouse" });
  const lastTap = useRef<{ word: string; offset: number; at: number }>(null);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const findWord = (x: number, y: number) =>
    wordAtPoint(x, y, chapterIndex, language);

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      press.current = {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse" || event.buttons !== 0) return;
      const word = findWord(event.clientX, event.clientY);
      if (isSameWord(word, hoveredWord.current)) return;
      hoveredWord.current = word;
      clearTimeout(hoverTimer.current);
      if (!word) return;
      hoverTimer.current = setTimeout(() => {
        highlightWord(word);
        callbacks.onWordHover(word);
      }, hoverDelayMs);
    },
    onPointerLeave: () => {
      clearTimeout(hoverTimer.current);
      hoveredWord.current = null;
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      const moved = Math.hypot(
        event.clientX - press.current.x,
        event.clientY - press.current.y,
      );
      if (moved > clickSlopPx || hasSelection()) return;
      const word = findWord(event.clientX, event.clientY);
      if (!word) return callbacks.onBlankClick(event);
      highlightWord(word);
      if (press.current.pointerType === "mouse")
        return callbacks.onWordClick(word);
      const isDoubleTap =
        lastTap.current?.offset === word.location.offset &&
        lastTap.current.word === word.text &&
        event.timeStamp - lastTap.current.at < doubleTapMs;
      lastTap.current = {
        word: word.text,
        offset: word.location.offset,
        at: event.timeStamp,
      };
      if (isDoubleTap) callbacks.onWordClick(word);
      else callbacks.onWordHover(word);
    },
  };
}

/** Removes the highlight from the word last looked up. */
export function clearWordHighlight() {
  if (typeof CSS !== "undefined" && CSS.highlights)
    CSS.highlights.delete(highlightName);
}

function wordAtPoint(
  x: number,
  y: number,
  chapterIndex: number,
  language: string,
): ReaderWord | null {
  const caret = caretAtPoint(x, y);
  const paragraph = caret?.node.parentElement?.closest(
    `[${paragraphAttribute}]`,
  );
  if (!caret || !paragraph) return null;
  const text = paragraph.textContent ?? "";
  const offset = offsetWithin(paragraph, caret.node, caret.offset);
  // The caret sits between characters, so the character under the pointer may be on either side of it.
  const word =
    wordAt(text, offset, language) ??
    (offset > 0 ? wordAt(text, offset - 1, language) : null);
  if (!word) return null;
  const rect = wordRectAt(paragraph, word, x, y);
  if (!rect) return null;
  return {
    text: word.text,
    sentence: sentenceAt(text, word.start, language)?.text ?? word.text,
    location: {
      chapterIndex,
      paragraphIndex: paragraphIndexOf(paragraph),
      offset: word.start,
    },
    rect,
  };
}

/** The rectangle of the word's line box under the point, or null when the point is beside the word rather than on it. */
function wordRectAt(
  paragraph: Element,
  word: { start: number; end: number },
  x: number,
  y: number,
): DOMRect | null {
  const rects = rangeOfSpan(paragraph, word.start, word.end)?.getClientRects();
  for (const rect of rects ?? []) {
    const isInside =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (isInside) return rect;
  }
  return null;
}

function highlightWord(word: ReaderWord) {
  if (typeof CSS === "undefined" || !CSS.highlights) return;
  const paragraph = document.querySelector(
    `[data-chapter="${word.location.chapterIndex}"] [${paragraphAttribute}="${word.location.paragraphIndex}"]`,
  );
  const range =
    paragraph &&
    rangeOfSpan(
      paragraph,
      word.location.offset,
      word.location.offset + word.text.length,
    );
  if (range) CSS.highlights.set(highlightName, new Highlight(range));
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
