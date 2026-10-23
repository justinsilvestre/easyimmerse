import type { ViewportPoint } from "../components/characterAtPoint.ts";
import { characterLength } from "../components/characterLength.ts";
import { runLookupStartAt } from "../components/runLookupStarts.ts";
import type { LookupText } from "../lookup/lookupTextAt.ts";
import { isUnspacedWord } from "./isUnspacedWord.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import { paragraphTextOf, rangeOfSpan } from "./textOffsets.ts";
import { type TextSpan, wordsAroundCaret } from "./wordAt.ts";

/** A word of a paragraph under a point of the window, with what its lookup sends and the sentence around it for a flashcard's context. */
export type ParagraphWord = {
  /** The word, or in a script written without spaces, the rest of it from the character pointed at. */
  text: string;
  /** Whether the word is in a script written without spaces, whose every character can begin a word. */
  isUnspaced: boolean;
  /** Where the word begins in the paragraph's text, or in a script written without spaces, the character pointed at. */
  start: number;
  sentence: string;
  lookup: LookupText;
  /** Where the word is drawn in the window, for placing the dictionary pop-up. */
  rect: DOMRect;
  /** The range of the whole word, which can be measured again once the text moves. */
  range: Range;
  /** Which of the range's line boxes, in the order `getClientRects` lists them, `rect` is, for a word broken across lines. */
  line: number;
};

/**
 * Finds the word of a paragraph under a point of the window, given the offset in the paragraph's text of the caret nearest the point,
 * or null when the point lies on no word.
 * In a script written without spaces, the word begins at the character under the point, as a lookup there does,
 * or at the first digit of a stretch of digits under it.
 */
export function paragraphWordAt(
  paragraph: Element,
  caretOffset: number,
  point: ViewportPoint,
  language: string,
): ParagraphWord | null {
  const text = paragraphTextOf(paragraph);
  for (const word of wordsAroundCaret(text, caretOffset, language)) {
    const range = rangeOfSpan(paragraph, word.start, word.end);
    const rects = [...(range?.getClientRects() ?? [])];
    const line = rects.findIndex((r) => contains(r, point));
    const rect = rects[line];
    if (!range || !rect) continue;
    const isUnspaced = isUnspacedWord(word.text);
    const start = isUnspaced
      ? word.start +
        runLookupStartAt(
          word.text,
          characterAt(paragraph, word, point) - word.start,
        )
      : word.start;
    return {
      text: text.slice(start, word.end),
      isUnspaced,
      start,
      ...sentenceLookupAt(text, start, language),
      rect,
      range,
      line,
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
