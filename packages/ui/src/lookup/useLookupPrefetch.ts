import {
  prefetchLookups,
  prefetchRepeatMs,
  useListDictionariesQuery,
} from "@easyimmerse/backend";
import { useEffect, useEffectEvent } from "react";
import { coversLanguage } from "../dictionaries/dictionaryLanguages.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { lookupQueryOf } from "./lookupQueryOf.ts";
import type { LookupText } from "./lookupTextAt.ts";

/**
 * Looks up ahead every word of the passages near the user, such as the subtitle cues about to be shown,
 * so that hovering or clicking one of them shows its entries at once.
 * `lookupsIn` gives the lookups of a passage's words, as hovering them would make them.
 * Nothing is looked up until the dictionaries are known and one covers the language.
 * The passages are looked up again each time they change, when the dictionaries change, and every `prefetchRepeatMs`,
 * which keeps their cached lookups from expiring while they stay near.
 */
export function useLookupPrefetch(
  language: string,
  passages: readonly string[],
  lookupsIn: (passage: string) => readonly LookupText[],
) {
  const dispatch = useAppDispatch();
  const listed = useListDictionariesQuery().data?.dictionaries;
  const isCovered = listed?.some((d) => coversLanguage(d, language)) ?? false;
  const prefetch = useEffectEvent(() => {
    const lookups = passages.flatMap((passage) =>
      lookupsIn(passage).map((lookup) => lookupQueryOf(lookup, language)),
    );
    void prefetchLookups(dispatch, lookups);
  });
  const rangeKey = passages.join("\u0000");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the range and the dictionaries are what call for another prefetch.
  useEffect(() => {
    if (!isCovered) return;
    prefetch();
    const timer = setInterval(prefetch, prefetchRepeatMs);
    return () => clearInterval(timer);
  }, [isCovered, rangeKey, listed, language]);
}
