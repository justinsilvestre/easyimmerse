import { libraryChaptersOf } from "@easyimmerse/state";
import type { TextSpan as BookSpan, LibraryText } from "@easyimmerse/types";
import type { WordSpan } from "../../components/wordLookup/splitAtWords.ts";
import type { TextSpan } from "./wordAt.ts";

/**
 * The words a library manager set in each paragraph of a library document, by chapter and then by paragraph,
 * which alone are the reader's words in place of those the language's word boundaries find.
 */
export type StoredWords = readonly (readonly (readonly WordSpan[])[])[];

/** Returns the stored words of each paragraph of the book `documentOfLibraryText` builds from the same text, in the same places. */
export function storedWordsOf(text: LibraryText): StoredWords {
  return libraryChaptersOf(text).map((segments) =>
    segments.map((segment) => segment.words),
  );
}

/** Returns the stored words of a library document as spans of the book `documentOfLibraryText` builds, for marking them. */
export function storedWordSpansOf(text: LibraryText): BookSpan[] {
  return storedWordsOf(text).flatMap((paragraphs, chapter_index) =>
    paragraphs.flatMap((words, paragraph_index) =>
      words.map(({ start, end }) => ({
        chapter_index,
        paragraph_index,
        start,
        end,
      })),
    ),
  );
}

/** Returns the stored words of a paragraph as spans of its text. */
export function storedSpansOf(
  paragraph: string,
  words: readonly WordSpan[],
): TextSpan[] {
  return words.map(({ start, end }) => ({
    text: paragraph.slice(start, end),
    start,
    end,
  }));
}

/** Returns the stored word that holds the character at an offset, or null when none does. */
export function storedWordAt(
  paragraph: string,
  words: readonly WordSpan[],
  offset: number,
): TextSpan | null {
  const word = words.find(({ start, end }) => start <= offset && offset < end);
  return word ? (storedSpansOf(paragraph, [word])[0] ?? null) : null;
}

/** Returns the stored words beside a caret at an offset: the one after it first, then the one before it, as `wordsAroundCaret` does. */
export function storedWordsAroundCaret(
  paragraph: string,
  words: readonly WordSpan[],
  offset: number,
): TextSpan[] {
  const after = storedWordAt(paragraph, words, offset);
  const before = offset > 0 ? storedWordAt(paragraph, words, offset - 1) : null;
  if (before === null || before.start === after?.start)
    return after ? [after] : [];
  return after ? [after, before] : [before];
}
