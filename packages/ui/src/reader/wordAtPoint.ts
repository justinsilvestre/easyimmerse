import type { ViewportPoint } from "../components/characterAtPoint.ts";
import { type ParagraphWord, paragraphWordAt } from "./paragraphWordAt.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import {
  caretAtPoint,
  isInTranslation,
  offsetWithin,
  paragraphAttribute,
  paragraphIndexOf,
} from "./textOffsets.ts";

/** A word in the text, as `ParagraphWord` describes it, with the place in the book where it begins. */
export type ReaderWord = Omit<ParagraphWord, "start"> & {
  /** Where the word begins, or in a script written without spaces, the character pointed at. */
  location: ReaderLocation;
};

/** Finds the word under a point of the window, or null when the point lies on no word, as `paragraphWordAt` finds it. */
export function wordAtPoint(
  point: ViewportPoint,
  chapterIndex: number,
  language: string,
): ReaderWord | null {
  const caret = caretAtPoint(point.x, point.y);
  const paragraph = caret?.node.parentElement?.closest(
    `[${paragraphAttribute}]`,
  );
  // The translations shown beside the text are not looked up.
  if (!caret || !paragraph || isInTranslation(caret.node)) return null;
  const offset = offsetWithin(paragraph, caret.node, caret.offset);
  const word = paragraphWordAt(paragraph, offset, point, language);
  if (!word) return null;
  const { start, ...found } = word;
  return {
    ...found,
    location: {
      chapterIndex,
      paragraphIndex: paragraphIndexOf(paragraph),
      offset: start,
    },
  };
}
