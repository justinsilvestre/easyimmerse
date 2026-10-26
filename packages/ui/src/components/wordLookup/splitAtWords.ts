import type { TextPart } from "./ClickableText.tsx";

/** A word of a text by its offsets, in UTF-16 code units, as a library item's text stores it. */
export type WordSpan = { start: number; end: number };

/**
 * Splits text into the given words and the characters between them, as `splitIntoWords` does for the words it finds itself.
 * The words must be in order and must not overlap. Each word counts as written with spaces, so that it is highlighted whole.
 */
export function splitAtWords(
  text: string,
  words: readonly WordSpan[],
): TextPart[] {
  const parts: TextPart[] = [];
  let lastEnd = 0;
  const push = (start: number, end: number, isWord: boolean) => {
    if (end > start)
      parts.push({
        text: text.slice(start, end),
        isWord,
        isUnspaced: false,
        start,
      });
  };
  for (const word of words) {
    push(lastEnd, word.start, false);
    push(word.start, word.end, true);
    lastEnd = word.end;
  }
  push(lastEnd, text.length, false);
  return parts;
}
