import type { DictionarySummary, ProjectSettings } from "@easyimmerse/types";
import type { LanguageDictionaryStatus } from "../../projects/DictionaryStatus.tsx";

/**
 * Counts the enabled dictionaries that serve the project's languages. Words can be looked up
 * in those whose source language is the target language; among them, those whose definitions
 * are in the translation language fill the translated definitions.
 */
export function dictionaryStatusesOf(
  dictionaries: readonly DictionarySummary[],
  settings: Pick<ProjectSettings, "target_language" | "translation_language">,
): LanguageDictionaryStatus[] {
  const forLookup = dictionaries.filter(
    (dictionary) =>
      dictionary.is_enabled &&
      dictionary.source_language === settings.target_language,
  );
  const forTranslation = forLookup.filter(
    (dictionary) =>
      dictionary.target_language === settings.translation_language,
  );
  return [
    {
      language: settings.target_language,
      role: "target",
      dictionaryCount: forLookup.length,
    },
    {
      language: settings.translation_language,
      role: "translation",
      dictionaryCount: forTranslation.length,
    },
  ];
}
