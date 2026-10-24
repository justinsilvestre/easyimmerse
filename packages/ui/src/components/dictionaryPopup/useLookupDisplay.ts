import {
  buildDictionaryMediaUrl,
  skipToken,
  useListDictionariesQuery,
  useLookupTextQuery,
} from "@easyimmerse/backend";
import { type LookupPopup, selectServerConfig } from "@easyimmerse/state";
import type { DictionarySummary } from "@easyimmerse/types";
import { useCallback } from "react";
import { useAppSelector } from "../../useAppSelector.ts";
import { coversLanguage } from "../wordLookup/dictionaryLanguages.ts";
import {
  type LibraryWords,
  libraryLookupOf,
} from "../wordLookup/libraryWords.ts";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import type { LookupDisplayState } from "./lookupDisplayState.ts";
import { type LookupOutcome, lookupStateOf } from "./lookupStateOf.ts";

const noDictionaries: readonly DictionarySummary[] = [];

/**
 * What the dictionary pop-up shows for the word it is open on, read from the cache, and the dictionaries of the language.
 * Until the list of dictionaries arrives, the language counts as covered, so that the pop-up does not ask for a dictionary the user may have.
 * Given a library item's words, the pop-up shows the entry stored for the word instead, and nothing is looked up.
 */
export function useLookupDisplay(
  popup: LookupPopup | null,
  language: string,
  library?: LibraryWords,
) {
  const listed = useListDictionariesQuery().data?.dictionaries;
  const isCovered =
    listed === undefined || listed.some((d) => coversLanguage(d, language));
  const chosen = popup?.chosen ?? null;
  const query = (!library && isCovered && chosen?.word.query) || null;
  const lookup = useLookupTextQuery(query ?? skipToken);
  const server = useAppSelector(selectServerConfig);
  const resolveMediaUrl = useCallback<ResolveMediaUrl>(
    (dictionaryId, path) =>
      server && buildDictionaryMediaUrl(server, dictionaryId, path),
    [server],
  );
  const stored = library && chosen && libraryLookupOf(library, chosen);
  const isMissingDictionary =
    !library && (!isCovered || (chosen !== null && chosen.word.query === null));
  const state: LookupDisplayState | null = isMissingDictionary
    ? { kind: "noDictionary", language, term: chosen?.word.term }
    : chosen &&
      lookupStateOf(
        chosen.word.term,
        stored ? { kind: "answered", response: stored } : outcomeOf(lookup),
      );
  return {
    dictionaries: listed ?? noDictionaries,
    isCovered,
    /** The results for the word shown, never those of the word before while it is looked up. */
    results: stored?.results ?? lookup.currentData?.results ?? [],
    state,
    resolveMediaUrl,
  };
}

function outcomeOf(
  query: ReturnType<typeof useLookupTextQuery>,
): LookupOutcome {
  if (query.isFetching) return { kind: "pending" };
  if (query.isError) return { kind: "failed" };
  return query.data
    ? { kind: "answered", response: query.data }
    : { kind: "pending" };
}
