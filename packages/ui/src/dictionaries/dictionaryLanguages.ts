import type { DictionarySummary } from "@easyimmerse/types";

type DictionaryLanguages = Pick<
  DictionarySummary,
  "source_language" | "target_language"
>;

/** Tells whether two BCP 47 tags name the same language, ignoring script and region, so that `zh-Hans` matches `zh`. */
export function isSameLanguage(first: string, second: string): boolean {
  return primarySubtag(first) === primarySubtag(second);
}

/**
 * Tells whether a dictionary may hold the words of a language.
 * Lookup searches every dictionary, so one that does not state its language counts for every language.
 */
export function coversLanguage(
  dictionary: DictionaryLanguages,
  language: string,
): boolean {
  return (
    dictionary.source_language === null ||
    isSameLanguage(dictionary.source_language, language)
  );
}

/** Tells whether a dictionary may define words in a language, counting one that does not state it. */
export function definesInLanguage(
  dictionary: DictionaryLanguages,
  language: string,
): boolean {
  return (
    dictionary.target_language === null ||
    isSameLanguage(dictionary.target_language, language)
  );
}

function primarySubtag(tag: string): string {
  return tag.split(/[-_]/)[0]?.toLowerCase() ?? "";
}
