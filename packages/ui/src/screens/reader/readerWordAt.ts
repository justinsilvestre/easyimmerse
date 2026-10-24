import type { ReaderLocation } from "@easyimmerse/state";
import { characterLength } from "../../components/wordLookup/characterLength.ts";
import type { WordSpan } from "../../components/wordLookup/splitAtWords.ts";
import { isUnspacedWord } from "./isUnspacedWord.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import { storedWordAt } from "./storedWords.ts";
import { rangeOfSpan } from "./textOffsets.ts";
import { wordAt } from "./wordAt.ts";
import type { ReaderWord } from "./wordAtPoint.ts";

/** A word of the text as `ReaderWord` describes it, before the place it is drawn in the window is measured. */
export type ReaderWordText = Omit<ReaderWord, "rect">;

/**
 * The word at a place in a paragraph of the text, as the lookup cursor lands on it: a word written with spaces whole,
 * or in a script written without spaces the rest of the run from the character at the place.
 * Null when the place holds no word, as on punctuation.
 * Given the paragraph's stored words, as for a library document, only those are words, each taken whole.
 */
export function readerWordAt(
  paragraph: string,
  location: ReaderLocation,
  language: string,
  storedWords?: readonly WordSpan[],
): ReaderWordText | null {
  const word = storedWords
    ? storedWordAt(paragraph, storedWords, location.offset)
    : wordAt(paragraph, location.offset, language);
  if (word === null) return null;
  const isUnspaced = !storedWords && isUnspacedWord(word.text);
  const start = isUnspaced ? location.offset : word.start;
  return {
    text: paragraph.slice(start, word.end),
    isUnspaced,
    ...sentenceLookupAt(paragraph, start, language),
    location: { ...location, offset: start },
  };
}

/**
 * The range of the text the dictionary pop-up stands beside for a word of the paragraph's element:
 * the character the cursor lies on in a script written without spaces, and otherwise the whole word.
 */
export function anchorRangeOf(
  paragraph: Element,
  word: ReaderWordText,
): Range | null {
  const start = word.location.offset;
  const end = word.isUnspaced
    ? start + characterLength(word.text, 0)
    : start + word.text.length;
  return rangeOfSpan(paragraph, start, end);
}
