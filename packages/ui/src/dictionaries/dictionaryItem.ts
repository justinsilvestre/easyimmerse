import type {
  DictionaryFormatKind,
  DictionarySummary,
} from "@easyimmerse/types";
import { formatLanguagePair, languageName } from "../projects/languages.ts";

export const dictionaryFormatLabels: Record<DictionaryFormatKind, string> = {
  yomitan: "Yomitan",
  stardict: "StarDict",
  mdict: "MDict",
  csv: "CSV",
};

/** A dictionary the user has added, as the dictionaries settings list it. `isEnabled` is left out where dictionaries cannot be switched off. */
export type DictionaryItem = DictionarySummary & { isEnabled?: boolean };

/** Writes a dictionary's languages as `German → English`, or null when it states neither. */
export function describeDictionaryLanguages({
  source_language,
  target_language,
}: Pick<DictionarySummary, "source_language" | "target_language">):
  | string
  | null {
  if (source_language && target_language)
    return formatLanguagePair(source_language, target_language);
  const known = source_language ?? target_language;
  return known ? languageName(known) : null;
}
