import type { TextCursor } from "@easyimmerse/state";
import { type FocusEvent, type KeyboardEvent, useRef, useState } from "react";
import { textStepOfKey } from "./cursorKeys.ts";
import { clickableWordAttribute } from "./lookupTrigger.ts";
import { stepTextCursor } from "./textCursorStep.ts";
import { hitAt, type WordHit } from "./useWordGestures.ts";
import { wordPressKeyHandlers } from "./wordPressKeys.ts";

/** A part of clickable text, as `splitIntoWords` finds it. */
type TextPart = {
  text: string;
  start: number;
  isWord: boolean;
  isUnspaced: boolean;
};

/** How the keyboard reports where it points, and looks up without pointing, as `useWordGestures` returns them. */
type KeyboardPointing = {
  pointWithKeyboard: (hit: WordHit) => void;
  endKeyboardPointing: () => void;
  lookUpMatchedLength: (hit: WordHit) => Promise<number | null> | null;
};

/**
 * Lets the keyboard move the lookup cursor through a text of clickable words, as the mouse does.
 * A word that gains focus from the keyboard is pointed at, unless the cursor already lies within it.
 * Left and Right step the cursor along the text by a word, and with Shift by a character of a run, as `stepTextCursor` describes;
 * focus follows it from word to word. A step back within a run lands once the lookups it needs answer,
 * unless the cursor has moved or another step has begun meanwhile.
 * Escape, or focus leaving the text, takes away a cursor the keyboard placed. Enter and Space press the focused word.
 * Returns the handlers for the text's element and for each word's element,
 * and whether focus lies within the text, which is when the cursor is worth announcing.
 */
export function useKeyboardCursor(
  parts: readonly TextPart[],
  cursor: TextCursor | null,
  pointing: KeyboardPointing,
) {
  const [hasFocus, setHasFocus] = useState(false);
  // A press focuses the word under the pointer, which the pointer already points at.
  // A mouse focuses on pressing, but a tap only once the finger has lifted, so the press counts until its click.
  const isPressing = useRef(false);
  const isStepping = useRef(false);
  const cursorStart = cursor?.start ?? null;
  const latestCursorStart = useRef(cursorStart);
  latestCursorStart.current = cursorStart;
  const latestStep = useRef(0);
  const point = (part: TextPart, offset: number, element: HTMLElement) =>
    pointing.pointWithKeyboard(
      hitAt(part, element, offset - part.start, "keyboard"),
    );
  /** Focuses the word that holds `offset`, found beside `wordElement`, and points at the offset. */
  const moveTo = (wordElement: HTMLElement, offset: number) => {
    const target = wordAt(parts, offset);
    const element = target && elementOfWord(wordElement, parts, target);
    if (!target || !element) return;
    isStepping.current = true;
    element.focus();
    isStepping.current = false;
    point(target, offset, element);
  };
  const stepFrom = (event: KeyboardEvent<HTMLElement>, part: TextPart) => {
    const step = textStepOfKey(event);
    if (step === null) return;
    // Handled here, so that the page's own shortcuts for these keys leave it alone.
    event.preventDefault();
    const wordElement = event.currentTarget;
    const lookUpAt = (offset: number) => {
      const target = wordAt(parts, offset);
      const element = target && elementOfWord(wordElement, parts, target);
      if (!target || !element) return null;
      return pointing.lookUpMatchedLength(
        hitAt(target, element, offset - target.start, "keyboard"),
      );
    };
    const from = cursor ?? { start: part.start };
    const landing = stepTextCursor(parts, from, step, lookUpAt);
    if (typeof landing === "number") return moveTo(wordElement, landing);
    const stepNumber = ++latestStep.current;
    landing.then((offset) => {
      const isCurrent =
        stepNumber === latestStep.current &&
        latestCursorStart.current === cursorStart &&
        wordElement.isConnected;
      if (isCurrent) moveTo(wordElement, offset);
    });
  };
  return {
    hasFocus,
    textHandlers: {
      onPointerDownCapture: () => {
        isPressing.current = true;
      },
      onPointerCancelCapture: () => {
        isPressing.current = false;
      },
      onClickCapture: () => {
        isPressing.current = false;
      },
      onFocus: () => setHasFocus(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null))
          return;
        setHasFocus(false);
        pointing.endKeyboardPointing();
      },
    },
    handlersFor: (part: TextPart) => ({
      onFocus: (event: FocusEvent<HTMLElement>) => {
        const isFromPointer = isPressing.current;
        isPressing.current = false;
        if (isFromPointer || isStepping.current) return;
        if (cursorStart !== null && contains(part, cursorStart)) return;
        point(part, part.start, event.currentTarget);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") return pointing.endKeyboardPointing();
        wordPressKeyHandlers.onKeyDown(event);
        stepFrom(event, part);
      },
      onKeyUp: wordPressKeyHandlers.onKeyUp,
    }),
  };
}

function contains(part: TextPart, offset: number): boolean {
  return offset >= part.start && offset < part.start + part.text.length;
}

function wordAt(
  parts: readonly TextPart[],
  offset: number,
): TextPart | undefined {
  return parts.find((part) => part.isWord && contains(part, offset));
}

/** The element of a word, found among the words of the text that holds `wordElement`, in the order of its words. */
function elementOfWord(
  wordElement: HTMLElement,
  parts: readonly TextPart[],
  word: TextPart,
): HTMLElement | undefined {
  const text = wordElement.parentElement;
  const index = parts
    .filter((part) => part.isWord)
    .findIndex((part) => part.start === word.start);
  const wordElements = text?.querySelectorAll<HTMLElement>(
    `:scope > [${clickableWordAttribute}]`,
  );
  return wordElements?.[index];
}
