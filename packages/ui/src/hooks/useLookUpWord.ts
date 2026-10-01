import { useLazyLookupTermEverywhereQuery } from "@easyimmerse/backend";
import type { DictionaryLookupResult } from "@easyimmerse/types";
import { hasEntries } from "./useTermLookup.ts";

/**
 * Returns a function resolving the dictionary results for a word, in lower case first and then as written when lower case finds nothing.
 * A failed lookup resolves no results. Earlier lookups of the same term are reused.
 */
export function useLookUpWord(): (
  word: string,
) => Promise<readonly DictionaryLookupResult[]> {
  const [lookUpTerm] = useLazyLookupTermEverywhereQuery();
  const lookUp = async (term: string) =>
    (await lookUpTerm(term, true)).data?.results ?? [];
  return async (word) => {
    const lowerCase = word.toLowerCase();
    const results = await lookUp(lowerCase);
    if (hasEntries(results) || lowerCase === word) return results;
    return lookUp(word);
  };
}
