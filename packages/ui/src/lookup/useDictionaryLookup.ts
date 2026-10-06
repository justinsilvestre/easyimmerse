import {
  buildDictionaryMediaUrl,
  getServerConfig,
  skipToken,
  useLazyLookupTextQuery,
  useListDictionariesQuery,
  useLookupTextQuery,
} from "@easyimmerse/backend";
import type {
  DictionarySummary,
  LookupQuery,
  LookupResult,
} from "@easyimmerse/types";
import { useReducer } from "react";
import { coversLanguage } from "../dictionaries/dictionaryLanguages.ts";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import {
  type LookupPopup,
  type LookupRequest,
  reduceLookupPopup,
} from "./lookupPopup.ts";
import { type LookupOutcome, lookupStateOf } from "./lookupStateOf.ts";

const noDictionaries: readonly DictionarySummary[] = [];

/**
 * Looks words up in the dictionaries for a language and keeps the dictionary pop-up's state.
 * The pop-up asks for a dictionary instead when none covers the language.
 * `S` is the kind of passage words come from, such as a subtitle cue.
 */
export function useDictionaryLookup<S>(language: string) {
  const [popup, dispatch] = useReducer(
    reduceLookupPopup<S>,
    null as LookupPopup<S>,
  );
  const request = popup?.request ?? null;
  const listed = useListDictionariesQuery().data?.dictionaries;
  const dictionaries = listed ?? noDictionaries;
  // Until the list arrives, the lookup goes ahead, so that the pop-up does not ask for a dictionary the user may have.
  const isMissingDictionary =
    listed !== undefined && !listed.some((d) => coversLanguage(d, language));
  const query = useLookupTextQuery(
    request && !isMissingDictionary
      ? lookupQueryOf(request, language)
      : skipToken,
  );
  const [lookUpLazily] = useLazyLookupTextQuery();
  const [prefetchLazily] = useLazyLookupTextQuery();
  return {
    popup,
    request,
    dictionaries,
    /** The results for the word shown, never those of the word before while it is looked up. */
    results: query.currentData?.results ?? [],
    state: isMissingDictionary
      ? { kind: "noDictionary" as const, language, term: request?.term }
      : request && lookupStateOf(request.term, outcomeOf(query)),
    resolveMediaUrl,
    /**
     * Looks a word up without showing it, and resolves its results, or null when the lookup fails or no dictionary covers the language.
     * A lookup the pop-up already made or is making for the same word is reused.
     */
    lookUp: (
      wanted: LookupRequest<S>,
    ): Promise<readonly LookupResult[] | null> =>
      isMissingDictionary
        ? Promise.resolve(null)
        : lookUpLazily(lookupQueryOf(wanted, language), true)
            .unwrap()
            .then((response) => response.results)
            .catch(() => null),
    /** Starts looking a word up, so that its results are at hand when the pop-up shows it. */
    prefetch: (wanted: LookupRequest<S>) => {
      if (!isMissingDictionary)
        prefetchLazily(lookupQueryOf(wanted, language), true);
    },
    chooseWord: (chosen: LookupRequest<S>) =>
      dispatch({ type: "wordChosen", request: chosen }),
    openSearch: () => dispatch({ type: "searchOpened" }),
    search: (term: string) => dispatch({ type: "termSearched", term }),
    close: () => dispatch({ type: "closed" }),
  };
}

function lookupQueryOf<S>(
  request: LookupRequest<S>,
  language: string,
): LookupQuery {
  const { text, context, offset } = request.lookup;
  return context === undefined || offset === undefined
    ? { text, language }
    : { text, language, context, offset };
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

const resolveMediaUrl: ResolveMediaUrl = (dictionaryId, path) => {
  const server = getServerConfig();
  return server && buildDictionaryMediaUrl(server, dictionaryId, path);
};
