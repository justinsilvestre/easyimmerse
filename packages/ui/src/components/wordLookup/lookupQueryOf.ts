import type { LookupQuery } from "@easyimmerse/types";
import type { LookupText } from "./lookupTextAt.ts";

/**
 * The query that looks up a word in a language, sending its context only when its offset there is known.
 * Lookups that build their query here share one cache entry for the same word.
 */
export function lookupQueryOf(
  { text, context, offset }: Pick<LookupText, "text"> & Partial<LookupText>,
  language: string,
): LookupQuery {
  return context === undefined || offset === undefined
    ? { text, language }
    : { text, language, context, offset };
}
