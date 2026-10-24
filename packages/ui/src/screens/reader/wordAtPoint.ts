import type { WordSpan } from "../../components/splitAtWords.ts";
import type { ViewportPoint } from "../../components/wordLookup/characterAtPoint.ts";
import { characterLength } from "../../components/wordLookup/characterLength.ts";
import type { LookupText } from "../../components/wordLookup/lookupTextAt.ts";
import { runLookupStartAt } from "../../components/wordLookup/runLookupStarts.ts";
import { isUnspacedWord } from "./isUnspacedWord.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import { storedWordsAroundCaret } from "./storedWords.ts";
import {
  caretAtPoint,
  isInTranslation,
  offsetWithin,
  paragraphAttribute,
  paragraphIndexOf,
  paragraphTextOf,
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
 * In a script written without spaces, the word begins at the character under the point, as a lookup there does,
 * or at the first digit of a stretch of digits under it.
 * Given the stored words of the chapter's paragraphs, as for a library document, only those are words, each taken whole.
 */
export function wordAtPoint(
  point: ViewportPoint,
  chapterIndex: number,
  language: string,
  storedWords?: readonly (readonly WordSpan[])[],
): ReaderWord | null {
  const caret = caretAtPoint(point.x, point.y);
  const paragraph = caret?.node.parentElement?.closest(
    `[${paragraphAttribute}]`,
  );
  // The translations shown beside the text are not looked up.
  if (!caret || !paragraph || isInTranslation(caret.node)) return null;
  const text = paragraphTextOf(paragraph);
  const offset = offsetWithin(paragraph, caret.node, caret.offset);
  const paragraphIndex = paragraphIndexOf(paragraph);
  const stored = storedWords && (storedWords[paragraphIndex] ?? []);
  const candidates = stored
    ? storedWordsAroundCaret(text, stored, offset)
    : wordsAroundCaret(text, offset, language);
  for (const word of candidates) {
    const rect = rectsOf(paragraph, word).find((r) => contains(r, point));
    if (!rect) continue;
    const isUnspaced = !stored && isUnspacedWord(word.text);
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
      ...sentenceLookupAt(text, start, language),
      location: {
        chapterIndex,
        paragraphIndex,
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
