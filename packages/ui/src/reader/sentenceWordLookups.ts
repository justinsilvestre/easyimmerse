import { isUnspacedLetter } from "../components/ClickableText.tsx";
import { characterLength } from "../components/characterLength.ts";
import { type LookupText, lookupTextAt } from "../lookup/lookupTextAt.ts";
import { wordsOf } from "./wordAt.ts";

/**
 * The lookups of every place in a sentence that pointing at a word looks up from, with the sentence as context:
 * the start of each word written with spaces, and each character of a word written without them.
 * The sentence is as `sentenceLookupAt` sends it, and `language` sets its word boundaries, as it does for the text shown.
 */
export function sentenceWordLookups(
  sentence: string,
  language: string,
): LookupText[] {
  return wordsOf(sentence, language)
    .flatMap((word) =>
      isUnspacedLetter(String.fromCodePoint(word.text.codePointAt(0) ?? 0))
        ? characterStartsOf(word)
        : [word.start],
    )
    .map((start) => lookupTextAt(sentence, start));
}

function characterStartsOf(word: { text: string; start: number }): number[] {
  const starts: number[] = [];
  for (let at = 0; at < word.text.length; at += characterLength(word.text, at))
    starts.push(word.start + at);
  return starts;
}
