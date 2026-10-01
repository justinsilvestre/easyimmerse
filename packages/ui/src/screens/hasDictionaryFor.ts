import type { DictionarySummary } from "@easyimmerse/types";
import { isSameLanguage } from "../isSameLanguage.ts";

/**
 * Tells whether any dictionary can look up words in the target language.
 * When no dictionary declares its languages, any dictionary might, so any one counts.
 */
export function hasDictionaryFor(
  dictionaries: readonly DictionarySummary[],
  targetLanguage: string,
): boolean {
  const declared = dictionaries.filter(
    (dictionary) => dictionary.source_language !== null,
  );
  if (declared.length === 0) return dictionaries.length > 0;
  return declared.some(
    ({ source_language }) =>
      source_language !== null &&
      isSameLanguage(source_language, targetLanguage),
  );
}
