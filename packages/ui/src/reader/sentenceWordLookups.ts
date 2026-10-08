import { runLookupStarts } from "../components/runLookupStarts.ts";
import { type LookupText, lookupTextAt } from "../lookup/lookupTextAt.ts";
import { isUnspacedWord } from "./isUnspacedWord.ts";
import { wordsOf } from "./wordAt.ts";

/**
 * The lookups of every place in a sentence that pointing at a word looks up from, with the sentence as context:
 * the start of each word written with spaces, and in a word written without them, each place a batch lookup starts from:
 * every character, but a stretch of digits only once.
 * The sentence is as `sentenceLookupAt` sends it, and `language` sets its word boundaries, as it does for the text shown.
 */
export function sentenceWordLookups(
  sentence: string,
  language: string,
): LookupText[] {
  return wordsOf(sentence, language)
    .flatMap((word) =>
      isUnspacedWord(word.text)
        ? runLookupStarts(word.text).map((start) => word.start + start)
        : [word.start],
    )
    .map((start) => lookupTextAt(sentence, start));
}
