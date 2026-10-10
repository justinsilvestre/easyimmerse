import { selectCachedLookup } from "@easyimmerse/backend";
import type { RootState } from "@easyimmerse/state";
import type { LookupQuery } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/**
 * The length of the text that a word's lookup matched, when its answer is cached: null when it matched nothing, or when there is nothing to look up,
 * and undefined when the word has yet to be looked up or there is no word.
 * It renders the component again only when that length changes.
 */
export function useCachedMatchLength(
  query: LookupQuery | null | undefined,
): number | null | undefined {
  return useAppSelector((state: RootState) => {
    if (query === undefined) return undefined;
    if (query === null) return null;
    const results = selectCachedLookup(state, query)?.results;
    return results && (results[0]?.matchedText.length ?? null);
  });
}
