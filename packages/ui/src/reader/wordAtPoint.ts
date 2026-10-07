import { isUnspacedLetter } from "../components/ClickableText.tsx";
import type { ViewportPoint } from "../components/characterAtPoint.ts";
import { characterLength } from "../components/characterLength.ts";
import type { LookupText } from "../lookup/lookupTextAt.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import {
  caretAtPoint,
  offsetWithin,
  paragraphAttribute,
  paragraphIndexOf,
  rangeOfSpan,
} from "./textOffsets.ts";
import { type TextSpan, wordsAroundCaret } from "./wordAt.ts";

/** A word in the text, with what its lookup sends and the sentence around it for a flashcard's context. */
export type ReaderWord = {
  /** The word, or in a script written without spaces, the rest of it from the character pointed at. */
  text: string;
  /** Whether the word is in a script written without spaces, whose every character can begin a word. */
  isUnspaced: boolean;
  sentence: string;
  /** Where the word begins, or in a script written without spaces, the character pointed at. */
  location: ReaderLocation;
  lookup: LookupText;
  /** Where the word is drawn in the window, for placing the dictionary pop-up. */
  rect: DOMRect;
};

/**
 * Finds the word under a point of the window, or null when the point lies on no word.
 * In a script written without spaces, the word begins at the character under the point, as a lookup there does.
 */
export function wordAtPoint(
  point: ViewportPoint,
  chapterIndex: number,
  language: string,
): ReaderWord | null {
  const caret = caretAtPoint(point.x, point.y);
  const paragraph = caret?.node.parentElement?.closest(
    `[${paragraphAttribute}]`,
  );
  if (!caret || !paragraph) return null;
  const text = paragraph.textContent ?? "";
  const offset = offsetWithin(paragraph, caret.node, caret.offset);
  for (const word of wordsAroundCaret(text, offset, language)) {
    const rect = rectsOf(paragraph, word).find((r) => contains(r, point));
    if (!rect) continue;
    const isUnspaced = isUnspacedLetter(
      String.fromCodePoint(text.codePointAt(word.start) ?? 0),
    );
    const start = isUnspaced ? characterAt(paragraph, word, point) : word.start;
    return {
      text: text.slice(start, word.end),
      isUnspaced,
      ...sentenceLookupAt(text, start, language),
      location: {
        chapterIndex,
        paragraphIndex: paragraphIndexOf(paragraph),
        offset: start,
      },
      rect,
    };
  }
  return null;
}

/** The offset of the word's character under the point, or of its first character when none lies there. */
function characterAt(
  paragraph: Element,
  word: TextSpan,
  point: ViewportPoint,
): number {
  for (let at = word.start; at < word.end; ) {
    const end = at + characterLength(word.text, at - word.start);
    const span = { start: at, end };
    if (rectsOf(paragraph, span).some((rect) => contains(rect, point)))
      return at;
    at = end;
  }
  return word.start;
}

/** The rectangles of a span's line boxes. */
function rectsOf(
  paragraph: Element,
  span: { start: number; end: number },
): DOMRect[] {
  return [
    ...(rangeOfSpan(paragraph, span.start, span.end)?.getClientRects() ?? []),
  ];
}

function contains(rect: DOMRect, { x, y }: ViewportPoint): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
