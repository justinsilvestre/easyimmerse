import type { LookupWord } from "@easyimmerse/state";
import { lookupQueryOf } from "./lookupQueryOf.ts";
import type { LookupText } from "./lookupTextAt.ts";

/** A word to look up as `text` describes it, with no query when no dictionary covers the language, so that nothing is looked up. */
export function lookupWordOf(
  term: string,
  text: Pick<LookupText, "text"> & Partial<LookupText>,
  language: string,
  isCovered: boolean,
): LookupWord {
  return { term, query: isCovered ? lookupQueryOf(text, language) : null };
}
