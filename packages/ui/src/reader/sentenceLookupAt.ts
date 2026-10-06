import { type LookupText, lookupTextAt } from "../lookup/lookupTextAt.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";
import { sentenceAt } from "./wordAt.ts";

/**
 * Describes the lookup of a word that starts `start` code units into a paragraph, with the word's sentence as its context.
 * The zero-width spaces that join hard-wrapped lines are left out, so that a word broken across lines is still found.
 */
export function sentenceLookupAt(
  paragraph: string,
  start: number,
  language: string,
): { sentence: string; lookup: LookupText } {
  const span = sentenceAt(paragraph, start, language) ?? {
    text: paragraph,
    start: 0,
  };
  const sentence = withoutJoins(span.text);
  const offset = withoutJoins(paragraph.slice(span.start, start)).length;
  return { sentence, lookup: lookupTextAt(sentence, offset) };
}

function withoutJoins(text: string): string {
  return text.replaceAll(zeroWidthSpace, "");
}
