import {
  buildDictionaryMediaUrl,
  getServerConfig,
  skipToken,
  useListDictionariesQuery,
  useLookupTextQuery,
} from "@easyimmerse/backend";
import type { DictionarySummary, LookupQuery } from "@easyimmerse/types";
import { useReducer } from "react";
import { coversLanguage } from "../dictionaries/dictionaryLanguages.ts";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { type LookupRequest, reduceLookupPopup } from "./lookupPopup.ts";
import { type LookupOutcome, lookupStateOf } from "./lookupStateOf.ts";

const noDictionaries: readonly DictionarySummary[] = [];

/**
 * Looks words up in the dictionaries for a language and keeps the dictionary pop-up's state.
 * The pop-up asks for a dictionary instead when none covers the language.
 */
export function useDictionaryLookup(language: string) {
  const [popup, dispatch] = useReducer(reduceLookupPopup, null);
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
  return {
    popup,
    request,
    dictionaries,
    results: query.data?.results ?? [],
    state: isMissingDictionary
      ? { kind: "noDictionary" as const, language, term: request?.term }
      : request && lookupStateOf(request.term, outcomeOf(query)),
    resolveMediaUrl,
    chooseWord: (chosen: LookupRequest) =>
      dispatch({ type: "wordChosen", request: chosen }),
    openSearch: () => dispatch({ type: "searchOpened" }),
    search: (term: string) => dispatch({ type: "termSearched", term }),
    close: () => dispatch({ type: "closed" }),
  };
}

function lookupQueryOf(request: LookupRequest, language: string): LookupQuery {
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
