import type { DictionarySummary, ProjectSettings } from "@easyimmerse/types";
import {
  coversLanguage,
  definesInLanguage,
  isSameLanguage,
} from "../dictionaries/dictionaryLanguages.ts";
import type { LanguageDictionaryStatus } from "./DictionaryStatus.tsx";

/**
 * Counts the dictionaries that serve a project's flashcards: those that look up words of the target language,
 * and among them those that define them in the translation language, which fill the L1 definition.
 * A project that translates into its own target language has only the first count.
 */
export function dictionaryStatusesOf(
  dictionaries: readonly DictionarySummary[],
  settings: Pick<ProjectSettings, "target_language" | "translation_language">,
): LanguageDictionaryStatus[] {
  const target = settings.target_language;
  const translation = settings.translation_language;
  const lookingUp = dictionaries.filter((d) => coversLanguage(d, target));
  const targetStatus: LanguageDictionaryStatus = {
    language: target,
    role: "target",
    dictionaryCount: lookingUp.length,
  };
  if (isSameLanguage(target, translation)) return [targetStatus];
  const translating = lookingUp.filter((d) =>
    definesInLanguage(d, translation),
  );
  return [
    targetStatus,
    {
      language: translation,
      role: "translation",
      dictionaryCount: translating.length,
    },
  ];
}
