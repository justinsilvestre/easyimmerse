import { splitIntoWords } from "./ClickableText.tsx";
import { type LookupText, lookupTextAt } from "./lookupTextAt.ts";
import { runLookupStarts } from "./runLookupStarts.ts";

/**
 * The lookups of every place in a passage, such as a subtitle cue, that a word can be looked up from:
 * the start of each word written with spaces, and each place in a run of a script written without them that a lookup starts from,
 * which are those a batch lookup covers.
 */
export function wordLookupsIn(passage: string): LookupText[] {
  return splitIntoWords(passage)
    .filter((part) => part.isWord)
    .flatMap((part) =>
      (part.isUnspaced
        ? runLookupStarts(part.text).map((start) => part.start + start)
        : [part.start]
      ).map((start) => lookupTextAt(passage, start)),
    );
}
