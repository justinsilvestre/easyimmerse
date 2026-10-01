import {
  skipToken,
  useListDictionariesQuery,
  useLookupTermEverywhereQuery,
} from "@easyimmerse/backend";
import { selectLookup } from "@easyimmerse/state";
import type { DictionaryLookupResult } from "@easyimmerse/types";
import type { LookupStatus } from "../components/DictionaryPopupBody.tsx";
import { hasDictionaryFor } from "../screens/hasDictionaryFor.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Looks up the term in the open dictionary pop-up, in lower case first and then as written when lower case finds nothing.
 * Also tells whether any dictionary covers the target language.
 */
export function useTermLookup(targetLanguage: string): {
  results: readonly DictionaryLookupResult[];
  status: LookupStatus;
  hasDictionaries: boolean;
} {
  const lookup = useAppSelector(selectLookup);
  const term = lookup.kind === "open" ? lookup.term : "";
  const lowerCase = term.toLowerCase();
  const inLowerCase = useLookupTermEverywhereQuery(
    term === "" ? skipToken : lowerCase,
  );
  const shouldTryAsWritten =
    lowerCase !== term &&
    inLowerCase.currentData !== undefined &&
    !hasEntries(inLowerCase.currentData.results);
  const asWritten = useLookupTermEverywhereQuery(
    shouldTryAsWritten ? term : skipToken,
  );
  const shown = shouldTryAsWritten ? asWritten : inLowerCase;
  const dictionaries = useListDictionariesQuery();
  return {
    results: shown.currentData?.results ?? [],
    status: term === "" ? "idle" : describeStatus(shown),
    hasDictionaries:
      dictionaries.isLoading ||
      hasDictionaryFor(dictionaries.data?.dictionaries ?? [], targetLanguage),
  };
}

/** A query that has not started yet counts as loading, so that nothing claims there are no entries before it runs. */
function describeStatus({
  isUninitialized,
  isFetching,
  isError,
}: {
  isUninitialized: boolean;
  isFetching: boolean;
  isError: boolean;
}): LookupStatus {
  if (isUninitialized || isFetching) return "loading";
  return isError ? "error" : "idle";
}

/** Tells whether any dictionary found entries for the term. */
export function hasEntries(results: readonly DictionaryLookupResult[]) {
  return results.some((result) => result.entries.length > 0);
}
