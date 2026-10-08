import { isUnspacedLetter } from "../components/ClickableText.tsx";
import { characterLength } from "../components/characterLength.ts";
import type { LookupText } from "../lookup/lookupTextAt.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import { wordsOf } from "./wordAt.ts";

/**
 * The lookups of every place in a paragraph that pointing at a word looks up from, with the word's sentence as context:
 * the start of each word written with spaces, and each character of a word written without them.
 * `language` sets the word and sentence boundaries, as it does for the text shown.
 */
export function paragraphLookups(
  paragraph: string,
  language: string,
): LookupText[] {
  return wordsOf(paragraph, language)
    .flatMap((word) =>
      isUnspacedLetter(String.fromCodePoint(word.text.codePointAt(0) ?? 0))
        ? characterStartsOf(word)
        : [word.start],
    )
    .map((start) => sentenceLookupAt(paragraph, start, language).lookup);
}

function characterStartsOf(word: { text: string; start: number }): number[] {
  const starts: number[] = [];
  for (let at = 0; at < word.text.length; at += characterLength(word.text, at))
    starts.push(word.start + at);
  return starts;
}
