import type { DictionarySummary } from "@easyimmerse/types";
import { isSameLanguage } from "../isSameLanguage.ts";

/** Tells whether a dictionary has headwords in the target language, or "unknown" while the dictionaries are loading. */
export function findDictionaryStatus(
  dictionaries: readonly DictionarySummary[] | undefined,
  targetLanguage: string,
): "ready" | "missing" | "unknown" {
  if (dictionaries === undefined) return "unknown";
  const hasMatch = dictionaries.some(
    ({ source_language }) =>
      source_language !== null &&
      isSameLanguage(source_language, targetLanguage),
  );
  return hasMatch ? "ready" : "missing";
}
