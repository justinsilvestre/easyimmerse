import { splitIntoWords } from "../components/ClickableText.tsx";
import { characterLength } from "../components/characterLength.ts";
import { type LookupText, lookupTextAt } from "./lookupTextAt.ts";

/**
 * The lookups of every place in a passage, such as a subtitle cue, that a word can be looked up from:
 * the start of each word written with spaces, and each character of a run of a script written without them.
 */
export function wordLookupsIn(passage: string): LookupText[] {
  return splitIntoWords(passage)
    .filter((part) => part.isWord)
    .flatMap((part) =>
      (part.isUnspaced ? characterStartsOf(part) : [part.start]).map((start) =>
        lookupTextAt(passage, start),
      ),
    );
}

function characterStartsOf(part: { text: string; start: number }): number[] {
  const starts: number[] = [];
  for (let at = 0; at < part.text.length; at += characterLength(part.text, at))
    starts.push(part.start + at);
  return starts;
}
